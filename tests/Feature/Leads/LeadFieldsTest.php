<?php

declare(strict_types=1);

use App\Enums\EmploymentStatus;
use App\Enums\Furnished;
use App\Enums\LeadDuration;
use App\Enums\LeadLanguage;
use App\Enums\LeadSource;
use App\Enums\PropertyType;
use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Inertia\Testing\AssertableInertia;

beforeEach(function (): void {
    Event::fake([DashboardUpdated::class]);
});

test('a project field is edited in place from the fiche, the others untouched', function (): void {
    $lead = Lead::factory()->create([
        'first_name' => 'Léa', 'last_name' => 'Durand',
        'budget_cents' => null, 'origin_city' => 'Lyon', 'districts' => [9],
    ]);

    $this->actingAs(User::factory()->create())
        ->patch(route('leads.fields', $lead), ['budget_cents' => 260000])
        ->assertRedirect();

    $fresh = $lead->fresh();
    expect($fresh?->budget_cents)->toBe(260000)
        ->and($fresh?->origin_city)->toBe('Lyon')
        ->and($fresh?->districts)->toBe([9]);
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->message === 'a modifié le budget du lead Léa Durand');
});

test('lists and enums are written, an empty value clears the field, and nothing is broadcast without a change', function (): void {
    $lead = Lead::factory()->create(['first_name' => 'Léa', 'last_name' => 'Durand', 'origin_city' => 'Lyon', 'duration' => null]);

    $this->actingAs(User::factory()->create())
        ->patch(route('leads.fields', $lead), [
            'property_types' => ['studio', 't2'],
            'duration' => LeadDuration::cases()[0]->value,
            'furnished' => Furnished::cases()[0]->value,
            'origin_city' => '   ',
            'districts' => [],
        ])
        ->assertRedirect();

    $fresh = $lead->fresh();
    expect($fresh?->property_types?->map(fn (PropertyType $type): string => $type->value)->all())->toBe(['studio', 't2'])
        ->and($fresh?->duration)->toBe(LeadDuration::cases()[0])
        ->and($fresh?->furnished)->toBe(Furnished::cases()[0])
        ->and($fresh?->origin_city)->toBeNull()
        ->and($fresh?->districts)->toBeNull();
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => str_contains($event->message, 'le type de bien') && str_contains($event->message, "la ville d'origine"));

    Event::fake([DashboardUpdated::class]);
    $this->actingAs(User::factory()->create())
        ->patch(route('leads.fields', $lead), ['duration' => LeadDuration::cases()[0]->value])
        ->assertRedirect();
    Event::assertNotDispatched(DashboardUpdated::class);
});

test('the origin city comes with its country code, upper-cased and mentioned once', function (): void {
    $lead = Lead::factory()->create(['first_name' => 'Léa', 'last_name' => 'Durand', 'origin_city' => null, 'origin_country' => null]);

    $this->actingAs(User::factory()->create())
        ->patch(route('leads.fields', $lead), ['origin_city' => 'Genève', 'origin_country' => 'ch'])
        ->assertRedirect();

    expect($lead->fresh()?->origin_city)->toBe('Genève')
        ->and($lead->fresh()?->origin_country)->toBe('CH');
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->message === "a modifié la ville d'origine du lead Léa Durand");

    $this->actingAs(User::factory()->create())
        ->patch(route('leads.fields', $lead), ['origin_country' => 'Suisse'])
        ->assertSessionHasErrors('origin_country');
});

test('the employment status is set in place and exposed with its label', function (): void {
    $lead = Lead::factory()->create(['first_name' => 'Léa', 'last_name' => 'Durand']);

    $this->actingAs(User::factory()->create())
        ->patch(route('leads.fields', $lead), ['employment_status' => 'cdi', 'project_notes' => ' Dossier solide, relancer jeudi. '])
        ->assertRedirect();

    expect($lead->fresh()?->employment_status)->toBe(EmploymentStatus::Permanent)
        // Les notes de l'équipe ont leur colonne : `message` reste ce que le lead a dit.
        ->and($lead->fresh()?->project_notes)->toBe('Dossier solide, relancer jeudi.')
        ->and($lead->fresh()?->message)->toBe($lead->message);
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->message === 'a modifié la situation professionnelle, les notes libres du lead Léa Durand');

    $this->actingAs(User::factory()->create())
        ->get(route('leads.show', $lead))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('lead.employment_status', 'cdi')
            ->where('lead.employment_status_label', EmploymentStatus::Permanent->label())
            ->where('lead.project_notes', 'Dossier solide, relancer jeudi.')
            ->has('editOptions.employmentStatuses', count(EmploymentStatus::cases()))
            // « Entrepreneur » (dirigeant de sa société) à côté d'« Indépendant », demandé le 28 octobre 2026.
            ->where('editOptions.employmentStatuses.3', ['value' => 'entrepreneur', 'label' => 'Entrepreneur']));

    $this->actingAs(User::factory()->create())
        ->patch(route('leads.fields', $lead), ['employment_status' => 'pirate'])
        ->assertSessionHasErrors('employment_status');
});

test('unknown fields are ignored and the rules of the Converting Machine apply', function (): void {
    $lead = Lead::factory()->create(['first_name' => 'Léa', 'last_name' => 'Durand']);

    $this->actingAs(User::factory()->create())
        ->patch(route('leads.fields', $lead), ['first_name' => 'Pirate', 'districts' => [21]])
        ->assertSessionHasErrors('districts.0');

    expect($lead->fresh()?->first_name)->toBe('Léa');
});

test('the detail page exposes the raw values and the option lists the in-place editor needs', function (): void {
    $lead = Lead::factory()->create(['duration' => LeadDuration::cases()[0], 'furnished' => Furnished::cases()[0], 'guarantors' => ['physique']]);

    $this->actingAs(User::factory()->create())
        ->get(route('leads.show', $lead))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('lead.duration', LeadDuration::cases()[0]->value)
            ->where('lead.furnished', Furnished::cases()[0]->value)
            ->where('lead.guarantors', ['physique'])
            ->where('lead.origin_country', null)
            // Le prix à côté de la formule.
            ->where('editOptions.offers.0.label', fn (string $label): bool => str_contains($label, ' · ') && str_ends_with($label, ' €'))
            ->has('editOptions.propertyTypes')
            ->has('editOptions.durations')
            ->has('editOptions.guarantors')
            ->has('editOptions.furnishedOptions')
            ->has('editOptions.currencies'));
});

test('the contact (e-mail, phone, company, language) is edited in place, and the lead stays reachable', function (): void {
    $lead = Lead::factory()->create(['first_name' => 'Léa', 'last_name' => 'Durand', 'email' => 'lea@example.com', 'phone' => null, 'company' => null, 'language' => LeadLanguage::French]);
    $user = User::factory()->create();

    $this->actingAs($user)
        ->patch(route('leads.fields', $lead), ['company' => '  Nestlé ', 'language' => 'en', 'phone' => '+41 79 000 00 00'])
        ->assertRedirect();

    $fresh = $lead->fresh();
    expect($fresh?->company)->toBe('Nestlé')
        ->and($fresh?->language)->toBe(LeadLanguage::English)
        ->and($fresh?->phone)->toBe('+41 79 000 00 00');
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => str_contains($event->message, 'la société') && str_contains($event->message, 'la langue'));

    // L'e-mail s'efface, le téléphone reste : accepté.
    $this->actingAs($user)->patch(route('leads.fields', $lead), ['email' => ''])->assertRedirect();
    expect($lead->fresh()?->email)->toBeNull();

    // Effacer le téléphone aussi laisserait le lead injoignable : refusé.
    $this->actingAs($user)
        ->from(route('leads.show', $lead))
        ->patch(route('leads.fields', $lead), ['phone' => ''])
        ->assertSessionHasErrors(['phone' => 'Le lead doit garder un e-mail ou un téléphone.']);

    $this->actingAs($user)
        ->from(route('leads.show', $lead))
        ->patch(route('leads.fields', $lead), ['email' => 'pas-un-email'])
        ->assertSessionHasErrors('email');
});

test('the source and its note are edited in place too', function (): void {
    $lead = Lead::factory()->create(['first_name' => 'Léa', 'last_name' => 'Durand', 'source' => LeadSource::Website, 'source_note' => null]);

    $this->actingAs(User::factory()->create())
        ->patch(route('leads.fields', $lead), ['source' => 'referral', 'source_note' => 'Par un ancien client'])
        ->assertRedirect();

    expect($lead->fresh()?->source)->toBe(LeadSource::Referral)
        ->and($lead->fresh()?->source_note)->toBe('Par un ancien client');
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => str_contains($event->message, 'la source'));
});

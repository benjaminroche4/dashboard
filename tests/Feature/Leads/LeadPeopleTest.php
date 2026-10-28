<?php

declare(strict_types=1);

use App\Enums\EmploymentStatus;
use App\Enums\TenantSlot;
use App\Enums\WebsiteHelpType;
use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Inertia\Testing\AssertableInertia;

beforeEach(function (): void {
    Event::fake([DashboardUpdated::class]);
});

test('the fiche lists the lead as first person, with his professional situation, and no second person until one is named', function (): void {
    $lead = Lead::factory()->create([
        'first_name' => 'Léa', 'last_name' => 'Durand', 'email' => 'lea@example.com',
        'employment_status' => EmploymentStatus::Permanent,
    ]);

    $this->actingAs(User::factory()->create())->get(route('leads.show', $lead))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('people.primary.name', 'Léa Durand')
            ->where('people.primary.email', 'lea@example.com')
            ->where('people.primary.employment_status', EmploymentStatus::Permanent->value)
            ->where('people.primary.employer', null)
            ->where('people.co', null));
});

test('the professional situation of the lead is edited in place and mirrored on the lead column', function (): void {
    $lead = Lead::factory()->create(['first_name' => 'Léa', 'last_name' => 'Durand', 'employment_status' => null]);
    $member = User::factory()->create();

    $this->actingAs($member)
        ->patch(route('leads.people.update', [$lead, 'primary']), ['employment_status' => EmploymentStatus::Freelance->value])
        ->assertRedirect();
    $this->actingAs($member)
        ->patch(route('leads.people.update', [$lead, 'primary']), ['employer' => 'Axa', 'income_cents' => 320000])
        ->assertRedirect();

    $fresh = $lead->fresh();
    expect($fresh?->employment_status)->toBe(EmploymentStatus::Freelance)
        ->and($fresh?->tenant_profiles['primary']['employment_status'] ?? null)->toBe(EmploymentStatus::Freelance->value)
        ->and($fresh?->tenant_profiles['primary']['employer'] ?? null)->toBe('Axa')
        ->and($fresh?->tenantIncomeCents(TenantSlot::Primary))->toBe(320000);
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->message === 'a modifié la situation professionnelle du lead Léa Durand');

    // Rien n'est diffusé sans changement, et l'identité du lead ne passe pas par ici.
    Event::fake([DashboardUpdated::class]);
    $this->actingAs($member)->patch(route('leads.people.update', [$lead, 'primary']), ['employer' => 'Axa'])->assertRedirect();
    Event::assertNotDispatched(DashboardUpdated::class);
    $this->actingAs($member)->from(route('leads.show', $lead))
        ->patch(route('leads.people.update', [$lead, 'primary']), ['first_name' => 'Zoé'])
        ->assertSessionHasErrors('first_name');
});

test('a second person is added with her name, completed in place, found again on the client dossier, and removed', function (): void {
    $lead = Lead::factory()->create(['first_name' => 'Léa', 'last_name' => 'Durand']);
    $member = User::factory()->create();

    // Prénom et nom obligatoires pour la nommer.
    $this->actingAs($member)->from(route('leads.show', $lead))
        ->patch(route('leads.people.update', [$lead, 'co']), ['first_name' => 'marc', 'last_name' => ''])
        ->assertSessionHasErrors('last_name');

    $this->actingAs($member)
        ->patch(route('leads.people.update', [$lead, 'co']), ['first_name' => 'marc', 'last_name' => 'durand', 'email' => 'marc@example.com', 'phone' => '+33 6 11 22 33 44'])
        ->assertRedirect();
    $this->actingAs($member)
        ->patch(route('leads.people.update', [$lead, 'co']), ['employment_status' => EmploymentStatus::Student->value])
        ->assertRedirect();

    $fresh = $lead->fresh();
    expect($fresh?->coFullName())->toBe('Marc Durand')
        ->and($fresh?->co_email)->toBe('marc@example.com')
        ->and($fresh?->tenant_profiles['co']['employment_status'] ?? null)->toBe(EmploymentStatus::Student->value)
        // La situation du lead lui-même n'a pas bougé.
        ->and($fresh?->employment_status)->toBeNull();
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->message === 'a modifié la situation professionnelle de Marc Durand, seconde personne du lead Léa Durand');

    $this->actingAs($member)->get(route('leads.show', $lead))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('people.co.name', 'Marc Durand')
            ->where('people.co.employment_status_label', EmploymentStatus::Student->label()));

    $this->actingAs($member)->delete(route('leads.people.remove', $lead))->assertRedirect();
    $fresh = $lead->fresh();
    expect($fresh?->co_first_name)->toBeNull()
        ->and($fresh?->co_phone)->toBeNull()
        ->and($fresh?->tenant_profiles)->toBeNull();
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->message === 'a retiré Marc Durand du lead Léa Durand');
});

test('an owner lead has no people section and a read-only member cannot edit', function (): void {
    $owner = Lead::factory()->create(['help_type' => WebsiteHelpType::RentalManagement]);
    $member = User::factory()->create();

    $this->actingAs($member)->get(route('leads.show', $owner))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page->where('people', null));
    $this->actingAs($member)->patch(route('leads.people.update', [$owner, 'primary']), ['employer' => 'Axa'])->assertForbidden();
    $this->actingAs($member)->delete(route('leads.people.remove', $owner))->assertNotFound();

    $lead = Lead::factory()->create();
    $this->actingAs($member)->patch(route('leads.people.update', [$lead, 'elsewhere']), ['employer' => 'Axa'])->assertNotFound();

    $reader = User::factory()->create(['role' => 'member', 'permissions' => ['leads' => 'read', 'leads_create' => 'none']]);
    $this->actingAs($reader)->patch(route('leads.people.update', [$lead, 'primary']), ['employer' => 'Axa'])->assertForbidden();
});

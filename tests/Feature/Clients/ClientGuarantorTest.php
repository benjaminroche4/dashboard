<?php

declare(strict_types=1);

use App\Enums\EmploymentStatus;
use App\Models\Lead;
use App\Models\LeadGuarantor;
use App\Models\User;
use Inertia\Testing\AssertableInertia;

test('a guarantor is filled in from the dossier, updated and removed', function (): void {
    $user = User::factory()->staff()->create();
    $lead = Lead::factory()->converted()->create();

    $this->actingAs($user)
        ->post(route('clients.guarantors.store', $lead), [
            'first_name' => 'marie',
            'last_name' => 'mata',
            'email' => 'marie@example.com',
            'phone' => '+33 6 12 34 56 78',
            'income_cents' => 450_000,
        ])
        ->assertRedirect();

    $guarantor = LeadGuarantor::query()->firstOrFail();
    expect($guarantor->fullName())->toBe('Marie Mata')
        ->and($guarantor->income_cents)->toBe(450_000)
        ->and($guarantor->lead_id)->toBe($lead->id);

    $this->actingAs($user)
        ->get(route('clients.show', $lead))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->has('guarantors', 1)
            ->where('guarantors.0.name', 'Marie Mata')
            ->where('guarantors.0.income_cents', 450_000));

    $this->actingAs($user)
        ->patch(route('clients.guarantors.update', [$lead, $guarantor]), [
            'first_name' => 'Marie',
            'last_name' => 'Mata',
            'income_cents' => 500_000,
        ])
        ->assertRedirect();

    expect($guarantor->refresh()->income_cents)->toBe(500_000);

    $this->actingAs($user)
        ->delete(route('clients.guarantors.destroy', [$lead, $guarantor]))
        ->assertRedirect();

    expect(LeadGuarantor::query()->count())->toBe(0);
});

test('a guarantor of another dossier is out of reach', function (): void {
    $user = User::factory()->staff()->create();
    $lead = Lead::factory()->converted()->create();
    $guarantor = LeadGuarantor::factory()->for(Lead::factory()->converted(), 'lead')->create();

    $this->actingAs($user)
        ->delete(route('clients.guarantors.destroy', [$lead, $guarantor]))
        ->assertNotFound();
});

test('the household income adds up both tenants', function (): void {
    $lead = Lead::factory()->converted()->create(['income_cents' => 300_000, 'co_income_cents' => 250_000]);

    expect($lead->householdIncomeCents())->toBe(550_000);
    expect(Lead::factory()->converted()->create()->householdIncomeCents())->toBeNull();
});

test('a guarantor says what they do for a living, not only what they earn', function (): void {
    $user = User::factory()->staff()->create();
    $lead = Lead::factory()->converted()->create();

    $this->actingAs($user)
        ->post(route('clients.guarantors.store', $lead), [
            'first_name' => 'Marie',
            'last_name' => 'Mata',
            'employment_status' => 'cdi',
            'occupation' => 'Infirmière, hôpital Saint-Louis',
            'income_cents' => 450_000,
        ])
        ->assertSessionHasNoErrors();

    $guarantor = LeadGuarantor::query()->firstOrFail();
    expect($guarantor->employment_status)->toBe(EmploymentStatus::Permanent)
        ->and($guarantor->occupation)->toBe('Infirmière, hôpital Saint-Louis');

    // Le dossier expose le statut et son libellé, pour l'afficher tel quel.
    $this->actingAs($user)
        ->get(route('clients.show', $lead))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('guarantors.0.employment_status', 'cdi')
            ->where('guarantors.0.employment_status_label', 'CDI')
            ->where('guarantors.0.occupation', 'Infirmière, hôpital Saint-Louis'));

    // Une situation inconnue est refusée : la liste est fermée.
    $this->actingAs($user)
        ->post(route('clients.guarantors.store', $lead), [
            'first_name' => 'Paul',
            'last_name' => 'Roux',
            'employment_status' => 'astronaute',
        ])
        ->assertSessionHasErrors('employment_status');
});

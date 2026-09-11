<?php

declare(strict_types=1);

use App\Enums\EmploymentStatus;
use App\Enums\ResidencyStatus;
use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Inertia\Testing\AssertableInertia;

beforeEach(fn () => Event::fake([DashboardUpdated::class]));

test('a member fills the details of a tenant and the dossier shows them back', function (): void {
    $staff = User::factory()->create();
    $client = Lead::factory()->converted()->create(['first_name' => 'Léa', 'last_name' => 'Durand']);

    $this->actingAs($staff)
        ->from(route('clients.show', $client))
        ->patch(route('clients.tenant-profile', ['lead' => $client, 'slot' => 'primary']), [
            'birth_date' => '1994-05-12',
            'nationality' => 'brésilienne',
            'birth_place' => 'São Paulo, Brésil',
            'residency_status' => ResidencyStatus::TalentPassport->value,
            'residency_number' => 'FR-123456',
            'residency_expires_at' => '2030-01-31',
            'employment_status' => EmploymentStatus::Permanent->value,
            'employer' => 'Doctolib',
            'income' => '4200.50',
        ])
        ->assertRedirect(route('clients.show', $client))
        ->assertSessionHasNoErrors();

    $profile = $client->refresh()->tenant_profiles['primary'];
    expect($profile)->toMatchArray([
        'birth_date' => '1994-05-12',
        // La nationalité est capitalisée comme les noms de personnes.
        'nationality' => 'Brésilienne',
        'residency_status' => 'passeport_talent',
        'residency_number' => 'FR-123456',
        'employment_status' => 'cdi',
        'income_cents' => 420_050,
    ]);

    Event::assertDispatched(fn (DashboardUpdated $event): bool => $event->resource === 'clients'
        && $event->message === 'a mis à jour les informations de Léa Durand');

    $this->actingAs($staff)->get(route('clients.show', $client))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('tenantProfiles.primary.nationality', 'Brésilienne')
            ->where('tenantProfiles.primary.residency_label', 'Passeport talent')
            ->where('tenantProfiles.primary.employment_label', 'CDI')
            ->where('tenantProfiles.primary.income_cents', 420_050)
            // Sans second locataire, pas de second emplacement.
            ->missing('tenantProfiles.co')
            ->has('residencyStatuses', 6)
            ->has('employmentStatuses', 8));
});

test('a citizen of the European Union keeps no permit number, and an empty form clears the details', function (): void {
    $staff = User::factory()->create();
    $client = Lead::factory()->converted()->create();

    $this->actingAs($staff)->patch(route('clients.tenant-profile', ['lead' => $client, 'slot' => 'primary']), [
        'residency_status' => ResidencyStatus::EuCitizen->value,
        'residency_number' => 'IGNORÉ',
        'residency_expires_at' => '2030-01-31',
    ])->assertSessionHasNoErrors();

    expect($client->refresh()->tenant_profiles['primary'])
        ->toMatchArray(['residency_status' => 'ue', 'residency_number' => null, 'residency_expires_at' => null]);

    $this->actingAs($staff)->patch(route('clients.tenant-profile', ['lead' => $client, 'slot' => 'primary']), [])
        ->assertSessionHasNoErrors();

    expect($client->refresh()->tenant_profiles)->toBeNull();
});

test('the details refuse invalid values, an unknown slot, a missing co-tenant and a lead that is not a client', function (): void {
    $staff = User::factory()->create();
    $client = Lead::factory()->converted()->create();

    $this->actingAs($staff)->patch(route('clients.tenant-profile', ['lead' => $client, 'slot' => 'primary']), [
        'birth_date' => 'demain',
        'residency_status' => 'inconnu',
        'income' => -5,
    ])->assertSessionHasErrors(['birth_date', 'residency_status', 'income']);

    $this->actingAs($staff)
        ->patch(route('clients.tenant-profile', ['lead' => $client, 'slot' => 'troisieme']), [])
        ->assertNotFound();

    // Le second locataire n'existe pas sur ce dossier.
    $this->actingAs($staff)
        ->patch(route('clients.tenant-profile', ['lead' => $client, 'slot' => 'co']), [])
        ->assertNotFound();

    $lead = Lead::factory()->create();
    $this->actingAs($staff)
        ->patch(route('clients.tenant-profile', ['lead' => $lead, 'slot' => 'primary']), [])
        ->assertNotFound();
});

test('the second tenant has his own details', function (): void {
    $staff = User::factory()->create();
    $client = Lead::factory()->converted()->create(['co_first_name' => 'Marc', 'co_last_name' => 'Dubois']);

    $this->actingAs($staff)->patch(route('clients.tenant-profile', ['lead' => $client, 'slot' => 'co']), [
        'employment_status' => EmploymentStatus::Student->value,
        'employer' => 'Sorbonne',
    ])->assertSessionHasNoErrors();

    expect($client->refresh()->tenant_profiles)->toHaveKey('co')
        ->and($client->tenant_profiles)->not->toHaveKey('primary');

    Event::assertDispatched(fn (DashboardUpdated $event): bool => $event->message === 'a mis à jour les informations de Marc Dubois');

    $this->actingAs($staff)->get(route('clients.show', $client))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('tenantProfiles.co.role', 'Second locataire')
            ->where('tenantProfiles.co.employment_label', 'Étudiant'));
});

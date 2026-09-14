<?php

declare(strict_types=1);

use App\Enums\LeadStatus;
use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Inertia\Testing\AssertableInertia;

test('a dossier opens without any lead, already converted and traceable', function (): void {
    Event::fake([DashboardUpdated::class]);
    $member = User::factory()->create();

    $this->actingAs($member)
        ->post(route('clients.store'), [
            'first_name' => 'léa',
            'last_name' => 'durand',
            'email' => 'lea@example.com',
            'offer' => 'confie',
            'budget_cents' => 250_000,
            'currency' => 'EUR',
            'arrival_at' => '2026-11-03',
            'assigned_to' => $member->id,
            'message' => 'Recommandée par un propriétaire.',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('clients.show', Lead::query()->sole()));

    $lead = Lead::query()->sole();

    // C'est un client dès l'ouverture, avec sa référence et son suivi.
    expect($lead->status)->toBe(LeadStatus::Converted)
        ->and($lead->fullName())->toBe('Léa Durand')
        ->and($lead->reference)->toStartWith('LD-')
        ->and($lead->assigned_to)->toBe($member->id)
        ->and($lead->created_by)->toBe($member->id)
        ->and($lead->budget_cents)->toBe(250_000)
        // L'historique porte le passage en « Converti » : c'est lui qui donne
        // le « client depuis » de la liste des dossiers.
        ->and($lead->statusChanges()->where('to_status', LeadStatus::Converted)->exists())->toBeTrue()
        // Et une note dit d'où vient ce dossier.
        ->and($lead->notes()->latest('id')->first()?->body)->toContain('sans passer par un lead');

    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->resource === 'clients'
        && str_contains((string) $event->message, 'a ouvert le dossier client Léa Durand'));
});

test('the dossier appears in the list of dossiers, in the converted column of the kanban', function (): void {
    Event::fake([DashboardUpdated::class]);
    $member = User::factory()->create();

    $this->actingAs($member)->post(route('clients.store'), [
        'first_name' => 'Léa',
        'last_name' => 'Durand',
        'phone' => '+33 6 12 34 56 78',
        'offer' => 'confie',
    ])->assertSessionHasNoErrors();

    $this->actingAs($member)->get(route('clients.index'))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->has('clients', 1)
            ->where('clients.0.name', 'Léa Durand')
            // Les listes du dialogue arrivent avec la page.
            ->has('languages')
            ->has('currencies'));

    // Le dossier reste un lead converti : le kanban le montre dans sa colonne.
    $this->actingAs($member)->get(route('leads.index'))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->has('leads', 1)
            ->where('leads.0.status', 'converted'));
});

test('a dossier needs a name and a way to reach the client', function (): void {
    Event::fake([DashboardUpdated::class]);
    $member = User::factory()->create();

    $this->actingAs($member)
        ->from(route('clients.index'))
        ->post(route('clients.store'), ['first_name' => 'Léa'])
        ->assertSessionHasErrors(['last_name', 'email', 'phone']);

    expect(Lead::query()->count())->toBe(0);
});

test('only a member allowed to create leads opens a dossier', function (): void {
    Event::fake([DashboardUpdated::class]);

    $this->post(route('clients.store'), ['first_name' => 'Léa', 'last_name' => 'Durand', 'phone' => '+33 6 00 00 00 00'])
        ->assertRedirect(route('login'));

    // Ouvrir un dossier, c'est créer un lead : les deux Converting Machines
    // doivent être fermées pour que ce soit refusé.
    $reader = User::factory()->create(['permissions' => [
        'leads' => 'read',
        'clients' => 'read',
        'leads_create' => 'none',
        'owner_leads_create' => 'none',
    ]]);

    $this->actingAs($reader)
        ->post(route('clients.store'), ['first_name' => 'Léa', 'last_name' => 'Durand', 'phone' => '+33 6 00 00 00 00'])
        ->assertForbidden();

    expect(Lead::query()->count())->toBe(0);
});

test('a client file created by hand needs an offer', function (): void {
    $this->actingAs(User::factory()->create())
        ->post(route('clients.store'), ['first_name' => 'Léa', 'last_name' => 'Durand', 'email' => 'lea@example.com'])
        ->assertSessionHasErrors('offer');
});

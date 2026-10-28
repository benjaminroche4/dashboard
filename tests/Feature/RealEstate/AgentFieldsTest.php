<?php

declare(strict_types=1);

use App\Enums\AgencySpecialty;
use App\Enums\AgentPosition;
use App\Enums\RelationshipQuality;
use App\Events\DashboardUpdated;
use App\Models\Agency;
use App\Models\Agent;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;

beforeEach(function (): void {
    Event::fake([DashboardUpdated::class]);
    Http::fake();
});

test('a field of the agent is edited in place from the fiche, the others untouched', function (): void {
    $agent = Agent::factory()->create(['first_name' => 'Zoé', 'last_name' => 'Martin', 'phone' => '+33 6 00 00 00 00', 'email' => 'zoe@example.com']);

    $this->actingAs(User::factory()->create())
        ->patch(route('agents.fields', $agent), ['phone' => ' +33 6 12 34 56 78 '])
        ->assertRedirect();

    $fresh = $agent->fresh();
    expect($fresh?->phone)->toBe('+33 6 12 34 56 78')
        ->and($fresh?->email)->toBe('zoe@example.com');
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->message === "a modifié le téléphone de l'agent Zoé Martin");
});

test('enums, agency and notes are written, an empty value clears the field, nothing is broadcast without a change', function (): void {
    $agency = Agency::factory()->create();
    // Valeurs de départ explicites : la factory tire fonction et qualité au hasard,
    // et un champ déjà à la bonne valeur ne serait pas « modifié ».
    $agent = Agent::factory()->create(['first_name' => 'Zoé', 'last_name' => 'Martin', 'agency_id' => null, 'position' => null, 'relationship_quality' => null, 'notes' => null, 'street' => '1 rue de Rivoli', 'postal_code' => '75001', 'city' => 'Paris', 'latitude' => 48.8, 'longitude' => 2.3]);
    $user = User::factory()->create();

    $this->actingAs($user)
        ->patch(route('agents.fields', $agent), [
            'position' => AgentPosition::Negotiator->value,
            'relationship_quality' => RelationshipQuality::Good->value,
            'notes' => 'Très réactive.',
            'email' => '   ',
        ])
        ->assertRedirect();

    $fresh = $agent->fresh();
    expect($fresh?->position)->toBe(AgentPosition::Negotiator)
        ->and($fresh?->relationship_quality)->toBe(RelationshipQuality::Good)
        ->and($fresh?->notes)->toBe('Très réactive.')
        ->and($fresh?->email)->toBeNull();
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => str_contains($event->message, 'la fonction') && str_contains($event->message, 'les notes'));

    // Rattacher à une agence efface l'adresse propre et la position sur la carte.
    $this->actingAs($user)
        ->patch(route('agents.fields', $agent), ['agency_id' => $agency->id])
        ->assertRedirect();
    $fresh = $agent->fresh();
    expect($fresh?->agency_id)->toBe($agency->id)
        ->and($fresh?->street)->toBeNull()
        ->and($fresh?->latitude)->toBeNull();

    Event::fake([DashboardUpdated::class]);
    $this->actingAs($user)
        ->patch(route('agents.fields', $agent), ['notes' => 'Très réactive.'])
        ->assertRedirect();
    Event::assertNotDispatched(DashboardUpdated::class);
});

test('an invalid value is refused with its field, and a member without write access cannot edit', function (): void {
    $agent = Agent::factory()->create();

    $this->actingAs(User::factory()->create())
        ->from(route('agents.show', $agent))
        ->patch(route('agents.fields', $agent), ['email' => 'pas-un-email', 'position' => 'ceo'])
        ->assertSessionHasErrors(['email', 'position']);
});

test('the matching profile is edited line by line, an emptied list clears it', function (): void {
    $agent = Agent::factory()->create(['first_name' => 'Zoé', 'last_name' => 'Martin', 'districts' => [3]]);
    $user = User::factory()->create();

    $this->actingAs($user)
        ->patch(route('agents.fields', $agent), ['districts' => [11, 9, 11], 'specialties' => [AgencySpecialty::cases()[0]->value]])
        ->assertRedirect();
    $fresh = $agent->fresh();
    expect($fresh?->districts)->toBe([11, 9])
        ->and($fresh?->specialties?->first())->toBe(AgencySpecialty::cases()[0]);
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => str_contains($event->message, 'les quartiers') && str_contains($event->message, 'les spécialités'));

    $this->actingAs($user)
        ->patch(route('agents.fields', $agent), ['districts' => []])
        ->assertRedirect();
    expect($agent->fresh()?->districts)->toBeNull();

    $this->actingAs($user)
        ->from(route('agents.show', $agent))
        ->patch(route('agents.fields', $agent), ['districts' => [42]])
        ->assertSessionHasErrors(['districts.0']);
});

test('the address arrives as one field (street, postal code, city) and is mentioned once', function (): void {
    $agent = Agent::factory()->create(['first_name' => 'Zoé', 'last_name' => 'Martin', 'agency_id' => null, 'street' => null, 'postal_code' => null, 'city' => null]);

    $this->actingAs(User::factory()->create())
        ->patch(route('agents.fields', $agent), ['street' => '12 rue de Rivoli', 'postal_code' => '75004', 'city' => 'Paris'])
        ->assertRedirect();

    $fresh = $agent->fresh();
    expect($fresh?->street)->toBe('12 rue de Rivoli')
        ->and($fresh?->postal_code)->toBe('75004')
        ->and($fresh?->city)->toBe('Paris');
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->message === "a modifié l’adresse de l'agent Zoé Martin");
});

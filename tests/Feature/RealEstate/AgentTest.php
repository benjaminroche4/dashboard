<?php

declare(strict_types=1);

use App\Actions\RealEstate\ImportAgents;
use App\Data\AgentImportRowData;
use App\Enums\AgentPosition;
use App\Events\DashboardUpdated;
use App\Mail\DirectoryWelcome;
use App\Models\Agency;
use App\Models\Agent;
use App\Models\Lead;
use App\Models\User;
use App\Models\Visit;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Mail;
use Inertia\Testing\AssertableInertia;

beforeEach(function (): void {
    Event::fake([DashboardUpdated::class]);
});

test('the agents page lists the agents with their agency and the agencies for the form', function (): void {
    $agency = Agency::factory()->create(['name' => 'Agence du Marais']);
    Agent::factory()->forAgency($agency)->create(['first_name' => 'Zoé', 'last_name' => 'Martin']);
    Agent::factory()->create(['first_name' => 'Ali', 'last_name' => 'Bensaïd']);

    $this->actingAs(User::factory()->create())
        ->get(route('agents.index'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('real-estate/agents')
            ->has('agents', 2)
            ->where('agents.0.name', 'Ali Bensaïd')
            ->where('agents.0.agency', null)
            ->where('agents.1.name', 'Zoé Martin')
            ->where('agents.1.agency.name', 'Agence du Marais')
            ->has('agencies', 1)
            ->where('agencies.0.name', 'Agence du Marais'));
});

test('an agent is created with capitalised names, attached to an agency, then updated', function (): void {
    $agency = Agency::factory()->create();
    $member = User::factory()->create();

    $this->actingAs($member)
        ->from(route('agents.index'))
        ->post(route('agents.store'), [
            'agency_id' => $agency->id,
            'first_name' => 'jean-pierre',
            'last_name' => "d'ORMESSON",
            'position' => 'negotiator',
            'street' => '5 rue de Bretagne',
            'postal_code' => '75003',
            'city' => 'Paris',
            'email' => 'jp@example.com',
            'phone' => '+33 6 12 34 56 78',
        ])
        ->assertRedirect(route('agents.index'))
        ->assertSessionHasNoErrors();

    $agent = Agent::query()->firstOrFail();

    expect($agent->fullName())->toBe("Jean-Pierre D'Ormesson")
        ->and($agent->agency_id)->toBe($agency->id)
        ->and($agent->position)->toBe(AgentPosition::Negotiator)
        ->and($agent->city)->toBe('Paris')
        ->and($agent->created_by)->toBe($member->id);

    $this->actingAs($member)
        ->patch(route('agents.update', $agent), ['first_name' => 'Jean-Pierre', 'last_name' => 'Dupont', 'agency_id' => null, 'email' => 'nope'])
        ->assertSessionHasErrors(['email']);

    $this->actingAs($member)
        ->patch(route('agents.update', $agent), ['first_name' => 'Jean-Pierre', 'last_name' => 'Dupont', 'agency_id' => ''])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect($agent->refresh()->last_name)->toBe('Dupont')
        ->and($agent->agency_id)->toBeNull();
});

test('the payload is validated and only admins delete an agent', function (): void {
    $agent = Agent::factory()->create();

    $this->actingAs(User::factory()->create())
        ->post(route('agents.store'), ['first_name' => '', 'last_name' => '', 'agency_id' => 999])
        ->assertSessionHasErrors(['first_name', 'last_name', 'agency_id']);

    $this->actingAs(User::factory()->create())
        ->delete(route('agents.destroy', $agent))
        ->assertForbidden();

    $this->actingAs(User::factory()->admin()->create())
        ->delete(route('agents.destroy', $agent))
        ->assertRedirect();

    expect(Agent::query()->whereKey($agent->id)->exists())->toBeFalse();
});

test('an agent has a detail page with its agency, leads and the agencies for the edit dialog', function (): void {
    $agency = Agency::factory()->create(['name' => 'Agence du Marais']);
    $agent = Agent::factory()->forAgency($agency)->create(['first_name' => 'Zoé', 'last_name' => 'Martin']);
    Lead::factory()->create(['agent_id' => $agent->id, 'first_name' => 'Léa', 'last_name' => 'Durand']);

    $this->actingAs(User::factory()->create())
        ->get(route('agents.show', $agent))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('real-estate/agent')
            ->where('agent.name', 'Zoé Martin')
            ->where('agent.agency.name', 'Agence du Marais')
            ->where('agent.leads.0.name', 'Léa Durand')
            ->where('agency.name', 'Agence du Marais')
            ->where('agency.agents_count', 1)
            ->has('agencies', 1));

    $this->actingAs(User::factory()->create())->get('/real-estate/agents/999')->assertNotFound();
});

test('a new agent is e-mailed only when asked, and only if it has an address', function (): void {
    Mail::fake();
    $member = User::factory()->create(['email' => 'charles@relocation-in-paris.fr']);

    $this->actingAs($member)->post(route('agents.store'), ['first_name' => 'Léa', 'last_name' => 'Durand', 'email' => 'lea@example.com'])->assertSessionHasNoErrors();
    $this->actingAs($member)->post(route('agents.store'), ['first_name' => 'Sans', 'last_name' => 'Adresse', 'phone' => '+33 6 00 00 00 00', 'notify' => true])->assertSessionHasNoErrors();
    Mail::assertNothingQueued();

    $this->actingAs($member)->post(route('agents.store'), ['first_name' => 'zoé', 'last_name' => 'martin', 'email' => 'zoe@example.com', 'notify' => true])->assertSessionHasNoErrors();

    Mail::assertQueued(DirectoryWelcome::class, fn (DirectoryWelcome $mail): bool => $mail->hasTo('zoe@example.com')
        && $mail->name === 'Zoé Martin'
        && $mail->hasReplyTo('charles@relocation-in-paris.fr')
        && str_contains($mail->render(), 'agent immobilier partenaire'));
});

test('an exchange noted on an agent or an agency dates the relationship', function (): void {
    Event::fake([DashboardUpdated::class]);
    $member = User::factory()->create();
    $agent = Agent::factory()->create(['first_name' => 'Julie', 'last_name' => 'Roux']);
    $agency = Agency::factory()->create(['name' => 'Century 21 Marais']);

    expect($agent->last_contacted_at)->toBeNull();

    $this->actingAs($member)->post(route('agents.touch', $agent))->assertRedirect();
    $this->actingAs($member)->post(route('agencies.touch', $agency), ['at' => '2026-09-01'])->assertRedirect();

    expect($agent->refresh()->last_contacted_at)->not->toBeNull()
        ->and($agency->refresh()->last_contacted_at?->toDateString())->toBe('2026-09-01');

    Event::assertDispatched(fn (DashboardUpdated $event): bool => $event->resource === 'agents'
        && $event->message === 'a noté un échange avec Julie Roux');
    Event::assertDispatched(fn (DashboardUpdated $event): bool => $event->resource === 'agencies'
        && $event->message === 'a noté un échange avec Century 21 Marais');

    // Une date invalide est refusée.
    $this->actingAs($member)->from(route('agents.show', $agent))
        ->post(route('agents.touch', $agent), ['at' => 'jamais'])
        ->assertSessionHasErrors('at');

    // La fiche expose la date pour la carte « Suivi de la relation ».
    $this->actingAs($member)->get(route('agents.show', $agent))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page->has('agent.last_contacted_at'));
});

test('the fiche of an agent counts the visits made with him and the primary agent opens its agency', function (): void {
    $member = User::factory()->create();
    $agency = Agency::factory()->create();
    $second = Agent::factory()->forAgency($agency)->create(['first_name' => 'Ali', 'last_name' => 'Bensaïd']);
    $primary = Agent::factory()->forAgency($agency)->create(['first_name' => 'Zoé', 'last_name' => 'Zola', 'is_primary' => true]);

    Visit::factory()->create(['agent_id' => $primary->id, 'scheduled_at' => '2026-09-01 10:00:00']);
    Visit::factory()->create(['agent_id' => $primary->id, 'scheduled_at' => '2026-08-01 10:00:00']);

    $this->actingAs($member)->get(route('agents.show', $primary))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('agent.visits_count', 2)
            ->where('agent.last_visit_at', fn (?string $at): bool => str_starts_with((string) $at, '2026-09-01'))
            ->where('agent.is_primary', true));

    // L'agent principal ouvre la liste des agents de son agence.
    $this->actingAs($member)->get(route('agencies.show', $agency))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('agency.agents.0.name', 'Zoé Zola')
            ->where('agency.agents.0.is_primary', true)
            ->where('agency.agents.1.name', 'Ali Bensaïd'));

    expect($second->refresh()->is_primary)->toBeFalse();
});

test('an imported job title that is not recognised is flagged for review', function (): void {
    $result = (new ImportAgents)->handle([
        AgentImportRowData::from(['first_name' => 'Zoé', 'last_name' => 'Martin', 'position' => 'Chef de cabinet', 'email' => 'zoe@example.com']),
        AgentImportRowData::from(['first_name' => 'Ali', 'last_name' => 'Bensaïd', 'position' => 'Négociateur', 'email' => 'ali@example.com']),
        AgentImportRowData::from(['first_name' => 'Léa', 'last_name' => 'Durand', 'position' => '', 'email' => 'lea@example.com']),
    ]);

    // La fonction inconnue atterrit en « Autre », mais elle est remontée telle quelle.
    expect($result['created'])->toBe(3)
        ->and($result['unknown_positions'])->toBe(['Chef de cabinet'])
        ->and(Agent::query()->where('first_name', 'Zoé')->first()?->position)->toBe(AgentPosition::Other)
        ->and(Agent::query()->where('first_name', 'Ali')->first()?->position)->toBe(AgentPosition::Negotiator)
        ->and(Agent::query()->where('first_name', 'Léa')->first()?->position)->toBeNull();
});

<?php

declare(strict_types=1);

use App\Enums\AgentPosition;
use App\Events\DashboardUpdated;
use App\Mail\DirectoryWelcome;
use App\Models\Agency;
use App\Models\Agent;
use App\Models\Lead;
use App\Models\User;
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
    Mail::assertNothingSent();

    $this->actingAs($member)->post(route('agents.store'), ['first_name' => 'zoé', 'last_name' => 'martin', 'email' => 'zoe@example.com', 'notify' => true])->assertSessionHasNoErrors();

    Mail::assertSent(DirectoryWelcome::class, fn (DirectoryWelcome $mail): bool => $mail->hasTo('zoe@example.com')
        && $mail->name === 'Zoé Martin'
        && $mail->hasReplyTo('charles@relocation-in-paris.fr')
        && str_contains($mail->render(), 'agent immobilier partenaire'));
});

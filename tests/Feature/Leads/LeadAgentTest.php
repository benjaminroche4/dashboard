<?php

declare(strict_types=1);

use App\Events\DashboardUpdated;
use App\Models\Agency;
use App\Models\Agent;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Inertia\Testing\AssertableInertia;

beforeEach(function (): void {
    Event::fake([DashboardUpdated::class]);
});

test('the lead page lists the agents directory and the agent in contact', function (): void {
    $agency = Agency::factory()->create(['name' => 'Agence du Marais']);
    $agent = Agent::factory()->forAgency($agency)->create(['first_name' => 'Zoé', 'last_name' => 'Martin', 'phone' => '+33 6 12 34 56 78']);
    $lead = Lead::factory()->create(['agent_id' => $agent->id]);

    $this->actingAs(User::factory()->create())
        ->get(route('leads.show', $lead))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->has('agents', 1)
            ->where('agents.0.name', 'Zoé Martin')
            ->where('agents.0.agency', 'Agence du Marais')
            ->where('lead.agent.id', $agent->id)
            ->where('lead.agent.agency', 'Agence du Marais'));
});

test('an agent is set on a lead, then removed, each change being broadcast', function (): void {
    $agent = Agent::factory()->create(['first_name' => 'Zoé', 'last_name' => 'Martin']);
    $lead = Lead::factory()->create();
    $user = User::factory()->create();

    $this->actingAs($user)
        ->patch(route('leads.agent', $lead), ['agent_id' => $agent->id])
        ->assertRedirect();

    expect($lead->refresh()->agent?->is($agent))->toBeTrue();
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => str_contains((string) $event->message, 'Zoé Martin'));

    $this->actingAs($user)
        ->patch(route('leads.agent', $lead), ['agent_id' => null])
        ->assertRedirect();

    expect($lead->refresh()->agent_id)->toBeNull();

    $this->actingAs($user)
        ->patch(route('leads.agent', $lead), ['agent_id' => 999])
        ->assertSessionHasErrors(['agent_id']);
});

test('deleting an agent detaches it from its leads', function (): void {
    $agent = Agent::factory()->create();
    $lead = Lead::factory()->create(['agent_id' => $agent->id]);

    $this->actingAs(User::factory()->admin()->create())
        ->delete(route('agents.destroy', $agent))
        ->assertRedirect();

    expect($lead->refresh()->agent_id)->toBeNull();
});

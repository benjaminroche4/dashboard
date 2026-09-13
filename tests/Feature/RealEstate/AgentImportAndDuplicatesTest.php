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

test('duplicate lookups find agents and agencies by e-mail or phone ending, excluding the edited one', function (): void {
    $agency = Agency::factory()->create(['name' => 'Agence du Marais', 'email' => 'contact@marais.example', 'phone' => '+33 1 42 00 11 22']);
    $agent = Agent::factory()->forAgency($agency)->create(['first_name' => 'Zoé', 'last_name' => 'Martin', 'email' => 'zoe@marais.example', 'phone' => '+33 6 12 34 56 78']);
    $user = User::factory()->create();

    $this->actingAs($user)
        ->getJson(route('agents.duplicates', ['email' => 'ZOE@marais.example']))
        ->assertOk()
        ->assertJsonCount(1)
        ->assertJsonPath('0.name', 'Zoé Martin')
        ->assertJsonPath('0.agency', 'Agence du Marais');

    $this->actingAs($user)
        ->getJson(route('agents.duplicates', ['phone' => '0612345678']))
        ->assertJsonCount(1);

    $this->actingAs($user)
        ->getJson(route('agents.duplicates', ['phone' => '0612345678', 'except' => $agent->id]))
        ->assertJsonCount(0);

    $this->actingAs($user)
        ->getJson(route('agents.duplicates', ['email' => 'x', 'phone' => '06']))
        ->assertJsonCount(0);

    $this->actingAs($user)
        ->getJson(route('agencies.duplicates', ['phone' => '01 42 00 11 22']))
        ->assertJsonCount(1)
        ->assertJsonPath('0.name', 'Agence du Marais');
});

test('the lists expose the author with avatar, the agency agents and the agent leads', function (): void {
    $author = User::factory()->create(['name' => 'Admin']);
    $agency = Agency::factory()->create(['created_by' => $author->id]);
    $agent = Agent::factory()->forAgency($agency)->create(['created_by' => $author->id, 'first_name' => 'Zoé', 'last_name' => 'Martin']);
    Lead::factory()->create(['agent_id' => $agent->id, 'first_name' => 'Léa', 'last_name' => 'Durand']);

    $this->actingAs($author)
        ->get(route('agencies.index'))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('agencies.0.creator', 'Admin')
            ->where('agencies.0.agents.0.name', 'Zoé Martin'));

    $this->actingAs($author)
        ->get(route('agents.index'))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('agents.0.creator', 'Admin')
            ->where('agents.0.leads.0.name', 'Léa Durand'));
});

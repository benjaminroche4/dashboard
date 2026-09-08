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

test('a member stars an agent, sees it first in the list and on its page, then unstars it', function (): void {
    $user = User::factory()->create();
    Agent::factory()->create(['first_name' => 'Ali', 'last_name' => 'Bensaïd']);
    $agent = Agent::factory()->create(['first_name' => 'Zoé', 'last_name' => 'Martin']);

    $this->actingAs($user)->post(route('agents.favorite', $agent))->assertRedirect();
    expect($agent->isFavoriteOf($user))->toBeTrue();
    // Favori personnel : rien n'est diffusé aux autres membres.
    Event::assertNotDispatched(DashboardUpdated::class);

    $this->actingAs($user)
        ->get(route('agents.index'))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('agents.0.name', 'Zoé Martin')
            ->where('agents.0.is_favorite', true)
            ->where('agents.1.name', 'Ali Bensaïd')
            ->where('agents.1.is_favorite', false));

    $this->actingAs($user)
        ->get(route('agents.show', $agent))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page->where('agent.is_favorite', true));

    $this->actingAs($user)->post(route('agents.favorite', $agent))->assertRedirect();
    expect($agent->isFavoriteOf($user))->toBeFalse();
});

test('a favorite is personal: another member does not see the star', function (): void {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $agent = Agent::factory()->create();

    $this->actingAs($user)->post(route('agents.favorite', $agent));

    $this->actingAs($other)
        ->get(route('agents.index'))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page->where('agents.0.is_favorite', false));
});

test('a member stars an agency and sees it first in the list and on its page', function (): void {
    $user = User::factory()->create();
    Agency::factory()->create(['name' => 'Agence du Marais']);
    $agency = Agency::factory()->create(['name' => 'Zénith Immobilier']);

    $this->actingAs($user)->post(route('agencies.favorite', $agency))->assertRedirect();

    $this->actingAs($user)
        ->get(route('agencies.index'))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('agencies.0.name', 'Zénith Immobilier')
            ->where('agencies.0.is_favorite', true)
            ->where('agencies.1.is_favorite', false));

    $this->actingAs($user)
        ->get(route('agencies.show', $agency))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page->where('agency.is_favorite', true));
});

test('the lead page flags the favorite agents of the current member', function (): void {
    $user = User::factory()->create();
    $agent = Agent::factory()->create();
    Agent::factory()->create();
    $lead = Lead::factory()->create();
    $this->actingAs($user)->post(route('agents.favorite', $agent));

    $this->actingAs($user)
        ->get(route('leads.show', $lead))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->has('agents', 2)
            ->where('agents', fn ($agents): bool => collect($agents)->firstWhere('id', $agent->id)['is_favorite'] === true
                && collect($agents)->where('is_favorite', true)->count() === 1));
});

test('favorite routes use the UUID and refuse the numeric id', function (): void {
    $user = User::factory()->create();
    $agent = Agent::factory()->create();
    $agency = Agency::factory()->create();

    $this->actingAs($user)->post("/real-estate/agents/{$agent->id}/favorite")->assertNotFound();
    $this->actingAs($user)->post("/real-estate/agencies/{$agency->id}/favorite")->assertNotFound();
    $this->actingAs($user)->post("/real-estate/agents/{$agent->uuid}/favorite")->assertRedirect();
});

test('favorites require an authenticated member', function (): void {
    $agent = Agent::factory()->create();

    $this->post(route('agents.favorite', $agent))->assertRedirect(route('login'));
});

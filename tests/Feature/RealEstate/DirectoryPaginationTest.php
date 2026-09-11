<?php

declare(strict_types=1);

use App\Http\Requests\RealEstate\IndexAgentsRequest;
use App\Models\Agency;
use App\Models\Agent;
use App\Models\User;
use Inertia\Testing\AssertableInertia;

test('the agents directory is paginated by the server', function (): void {
    $user = User::factory()->create();
    Agent::factory()->count(IndexAgentsRequest::PER_PAGE + 5)->create();

    $this->actingAs($user)
        ->get(route('agents.index'))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->has('agents', IndexAgentsRequest::PER_PAGE)
            ->where('pagination.total', IndexAgentsRequest::PER_PAGE + 5)
            ->where('pagination.last_page', 2)
            ->where('pagination.current_page', 1));

    $this->actingAs($user)
        ->get(route('agents.index', ['page' => 2]))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->has('agents', 5)
            ->where('pagination.current_page', 2));
});

test('the agents directory searches by name, agency and city on the server', function (): void {
    $user = User::factory()->create();
    $agency = Agency::factory()->create(['name' => 'Zénith Immobilier']);
    Agent::factory()->create(['first_name' => 'Ali', 'last_name' => 'Bensaïd', 'city' => 'Paris']);
    Agent::factory()->forAgency($agency)->create(['first_name' => 'Zoé', 'last_name' => 'Martin', 'city' => 'Lyon']);

    $this->actingAs($user)
        ->get(route('agents.index', ['q' => 'zénith']))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->has('agents', 1)
            ->where('agents.0.name', 'Zoé Martin')
            ->where('filters.q', 'zénith'));

    $this->actingAs($user)
        ->get(route('agents.index', ['q' => 'bensaïd']))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page->has('agents', 1)->where('agents.0.name', 'Ali Bensaïd'));
});

test('the agents directory sorts on a chosen column', function (): void {
    $user = User::factory()->create();
    Agent::factory()->create(['first_name' => 'Ali', 'last_name' => 'Bensaïd']);
    Agent::factory()->create(['first_name' => 'Zoé', 'last_name' => 'Martin']);

    $this->actingAs($user)
        ->get(route('agents.index', ['sort' => 'name', 'dir' => 'desc']))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page->where('agents.0.name', 'Zoé Martin'));
});

test('the agencies directory is paginated and carries every agency for the agent dialog', function (): void {
    $user = User::factory()->create();
    Agency::factory()->count(52)->create();

    $this->actingAs($user)
        ->get(route('agencies.index'))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->has('agencies', 50)
            ->has('agencyOptions', 52)
            ->where('pagination.total', 52));
});

test('an agent carries the quality of the relationship', function (): void {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('agents.store'), [
            'first_name' => 'zoé',
            'last_name' => 'martin',
            'relationship_quality' => 'excellent',
        ])
        ->assertRedirect();

    $agent = Agent::query()->firstOrFail();
    expect($agent->relationship_quality?->value)->toBe('excellent');

    $this->actingAs($user)
        ->get(route('agents.index'))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('agents.0.relationship_quality', 'excellent')
            ->where('agents.0.relationship_quality_label', 'Excellente'));

    $this->actingAs($user)
        ->patch(route('agents.update', $agent), [
            'first_name' => 'Zoé',
            'last_name' => 'Martin',
            'relationship_quality' => '',
        ])
        ->assertRedirect();

    expect($agent->refresh()->relationship_quality)->toBeNull();
});

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

test('the agencies page lists every agency with its agent count, sorted by name', function (): void {
    $b = Agency::factory()->create(['name' => 'Bureau Paris Ouest']);
    $a = Agency::factory()->create(['name' => 'Agence du Marais']);
    Agent::factory()->count(2)->forAgency($a)->create();

    $this->actingAs(User::factory()->create())
        ->get(route('agencies.index'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('real-estate/agencies')
            ->has('agencies', 2)
            ->where('agencies.0.id', $a->id)
            ->where('agencies.0.agents_count', 2)
            ->where('agencies.1.id', $b->id)
            ->where('agencies.1.agents_count', 0));
});

test('the pages are only available once logged in', function (): void {
    $this->get(route('agencies.index'))->assertRedirect(route('login'));
    $this->get(route('agents.index'))->assertRedirect(route('login'));
});

test('any member creates and updates an agency, blanks become null and the author is kept', function (): void {
    $member = User::factory()->create();

    $this->actingAs($member)
        ->from(route('agencies.index'))
        ->post(route('agencies.store'), [
            'name' => '  Agence du Marais ',
            'street' => '12 rue de Turenne',
            'postal_code' => '75003',
            'city' => 'Paris',
            'phone' => '',
            'email' => 'contact@marais.example',
            'website' => 'https://marais.example',
            'notes' => '   ',
        ])
        ->assertRedirect(route('agencies.index'))
        ->assertSessionHasNoErrors();

    $agency = Agency::query()->firstOrFail();

    expect($agency->name)->toBe('Agence du Marais')
        ->and($agency->phone)->toBeNull()
        ->and($agency->notes)->toBeNull()
        ->and($agency->created_by)->toBe($member->id);

    $this->actingAs($member)
        ->patch(route('agencies.update', $agency), ['name' => 'Agence du Marais & Co', 'website' => 'pas une url'])
        ->assertSessionHasErrors(['website']);

    $this->actingAs($member)
        ->patch(route('agencies.update', $agency), ['name' => 'Agence du Marais & Co', 'email' => null])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect($agency->refresh()->name)->toBe('Agence du Marais & Co')
        ->and($agency->email)->toBeNull();

    Event::assertDispatched(DashboardUpdated::class, 2);
});

test('only admins delete an agency and its agents are kept, detached', function (): void {
    $agency = Agency::factory()->create();
    $agent = Agent::factory()->forAgency($agency)->create();

    $this->actingAs(User::factory()->create())
        ->delete(route('agencies.destroy', $agency))
        ->assertForbidden();

    $this->actingAs(User::factory()->admin()->create())
        ->delete(route('agencies.destroy', $agency))
        ->assertRedirect();

    expect(Agency::query()->whereKey($agency->id)->exists())->toBeFalse()
        ->and($agent->refresh()->agency_id)->toBeNull();
});

test('an agency has a detail page with its agents and the leads they are in contact with', function (): void {
    $agency = Agency::factory()->create(['name' => 'Agence du Marais']);
    $agent = Agent::factory()->forAgency($agency)->create(['first_name' => 'Zoé', 'last_name' => 'Martin']);
    Lead::factory()->create(['agent_id' => $agent->id, 'first_name' => 'Léa', 'last_name' => 'Durand']);
    Lead::factory()->create(['agent_id' => Agent::factory()->create()->id]);

    $this->actingAs(User::factory()->create())
        ->get(route('agencies.show', $agency))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('real-estate/agency')
            ->where('agency.name', 'Agence du Marais')
            ->where('agency.agents_count', 1)
            ->where('agency.agents.0.name', 'Zoé Martin')
            ->where('agency.agents.0.leads_count', 1)
            ->has('agency.leads', 1)
            ->where('agency.leads.0.name', 'Léa Durand')
            ->where('agency.leads.0.agent', 'Zoé Martin'));
});

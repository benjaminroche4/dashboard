<?php

declare(strict_types=1);

use App\Models\Agency;
use App\Models\Agent;
use App\Models\User;
use Illuminate\Support\Str;

test('une agence et un agent reçoivent un uuid à leur création', function (): void {
    $agency = Agency::factory()->create();
    $agent = Agent::factory()->forAgency($agency)->create();

    expect(Str::isUuid($agency->uuid))->toBeTrue()
        ->and(Str::isUuid($agent->uuid))->toBeTrue()
        ->and(Agency::factory()->create()->uuid)->not->toBe($agency->uuid)
        ->and(Agent::factory()->create()->uuid)->not->toBe($agent->uuid);
});

test("les routes d'une agence portent l'uuid et refusent l'identifiant numérique", function (): void {
    $staff = User::factory()->staff()->create();
    $agency = Agency::factory()->create();

    expect(route('agencies.show', $agency))->toEndWith('/real-estate/agencies/'.$agency->uuid)
        ->and(route('agencies.show', $agency))->not->toContain('/agencies/'.$agency->id);

    $this->actingAs($staff)->get('/real-estate/agencies/'.$agency->uuid)
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('real-estate/agency')
            ->where('agency.id', $agency->id)
            ->where('agency.uuid', $agency->uuid));

    $this->actingAs($staff)->get('/real-estate/agencies/'.$agency->id)->assertNotFound();
    $this->actingAs($staff)->patch('/real-estate/agencies/'.$agency->id, ['name' => 'X'])->assertNotFound();
    $this->actingAs($staff)->delete('/real-estate/agencies/'.$agency->id)->assertNotFound();
    $this->actingAs($staff)->get('/real-estate/agencies/'.Str::uuid())->assertNotFound();
});

test("les routes d'un agent portent l'uuid et refusent l'identifiant numérique", function (): void {
    $staff = User::factory()->staff()->create();
    $agent = Agent::factory()->forAgency(Agency::factory()->create())->create();

    expect(route('agents.show', $agent))->toEndWith('/real-estate/agents/'.$agent->uuid)
        ->and(route('agents.show', $agent))->not->toContain('/agents/'.$agent->id);

    $this->actingAs($staff)->get('/real-estate/agents/'.$agent->uuid)
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('real-estate/agent')
            ->where('agent.id', $agent->id)
            ->where('agent.uuid', $agent->uuid)
            ->where('agent.agency.uuid', $agent->agency?->uuid)
            ->where('agencies.0.uuid', $agent->agency?->uuid));

    $this->actingAs($staff)->get('/real-estate/agents/'.$agent->id)->assertNotFound();
    $this->actingAs($staff)->patch('/real-estate/agents/'.$agent->id, ['first_name' => 'X', 'last_name' => 'Y'])->assertNotFound();
    $this->actingAs($staff)->delete('/real-estate/agents/'.$agent->id)->assertNotFound();
    $this->actingAs($staff)->get('/real-estate/agents/'.Str::uuid())->assertNotFound();
});

test("les listes et les doublons exposent l'uuid des agences et des agents", function (): void {
    $staff = User::factory()->staff()->create();
    $agency = Agency::factory()->create(['email' => 'contact@marais.example']);
    $agent = Agent::factory()->forAgency($agency)->create(['email' => 'zoe@marais.example']);

    $this->actingAs($staff)->get(route('agencies.index'))
        ->assertInertia(fn ($page) => $page
            ->where('agencies.0.uuid', $agency->uuid)
            ->where('agencies.0.agents.0.uuid', $agent->uuid));

    $this->actingAs($staff)->get(route('agents.index'))
        ->assertInertia(fn ($page) => $page->where('agents.0.uuid', $agent->uuid));

    $this->actingAs($staff)->getJson(route('agencies.duplicates', ['email' => 'contact@marais.example']))
        ->assertOk()
        ->assertJsonPath('0.uuid', $agency->uuid);

    $this->actingAs($staff)->getJson(route('agents.duplicates', ['email' => 'zoe@marais.example']))
        ->assertOk()
        ->assertJsonPath('0.uuid', $agent->uuid);
});

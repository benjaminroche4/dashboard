<?php

declare(strict_types=1);

use App\Enums\VisitStatus;
use App\Models\Agency;
use App\Models\Agent;
use App\Models\Lead;
use App\Models\Property;
use App\Models\User;
use App\Models\Visit;
use Illuminate\Support\Facades\Date;
use Inertia\Testing\AssertableInertia;

test('an agency shows the properties visited with its agents, the most recent first', function (): void {
    Date::setTestNow('2026-09-10 10:00:00');

    $agency = Agency::factory()->create();
    $agent = Agent::factory()->forAgency($agency)->create(['first_name' => 'Zoé', 'last_name' => 'Martin']);
    $other = Agent::factory()->create(); // agent d'une autre agence
    $lead = Lead::factory()->converted()->create();
    $flat = Property::factory()->create(['title' => 'T2 lumineux · 11e']);
    $studio = Property::factory()->create(['title' => 'Studio · 5e']);

    // Deux visites du même bien avec l'agence : une seule ligne, comptée deux fois.
    Visit::factory()->create(['agent_id' => $agent->id, 'property_id' => $flat->id, 'lead_id' => $lead->id, 'scheduled_at' => '2026-09-01 10:00:00']);
    Visit::factory()->status(VisitStatus::Done)->create(['agent_id' => $agent->id, 'property_id' => $flat->id, 'lead_id' => $lead->id, 'scheduled_at' => '2026-09-08 10:00:00']);
    Visit::factory()->create(['agent_id' => $agent->id, 'property_id' => $studio->id, 'lead_id' => $lead->id, 'scheduled_at' => '2026-08-20 10:00:00']);
    // Visite d'une autre agence : absente.
    Visit::factory()->create(['agent_id' => $other->id, 'property_id' => $studio->id, 'lead_id' => $lead->id, 'scheduled_at' => '2026-09-09 10:00:00']);

    $this->actingAs(User::factory()->create())
        ->get(route('agencies.show', $agency))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->has('agency.properties', 2)
            ->where('agency.properties.0.label', 'T2 lumineux · 11e')
            ->where('agency.properties.0.visits_count', 2)
            ->where('agency.properties.0.last_visit_status', 'Effectuée')
            ->where('agency.properties.0.agent', 'Zoé Martin')
            ->where('agency.properties.1.label', 'Studio · 5e')
            ->where('agency.properties.1.visits_count', 1)
            ->missing('agency.leads'));
});

test('an agency without any visit says so', function (): void {
    $agency = Agency::factory()->create();

    $this->actingAs(User::factory()->create())
        ->get(route('agencies.show', $agency))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page->has('agency.properties', 0));
});

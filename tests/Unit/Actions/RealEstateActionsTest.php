<?php

declare(strict_types=1);

use App\Actions\RealEstate\CreateAgency;
use App\Actions\RealEstate\CreateAgent;
use App\Actions\RealEstate\DeleteAgency;
use App\Actions\RealEstate\DeleteAgent;
use App\Actions\RealEstate\UpdateAgency;
use App\Actions\RealEstate\UpdateAgent;
use App\Data\AgencyData;
use App\Data\AgentData;
use App\Events\DashboardUpdated;
use App\Models\Agency;
use App\Models\Agent;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

beforeEach(function (): void {
    Event::fake([DashboardUpdated::class]);
});

test('the DTOs trim, nullify blanks and capitalise agent names', function (): void {
    $agency = AgencyData::from(['name' => ' Marais ', 'city' => '', 'website' => 'https://x.example']);
    $agent = AgentData::from(['first_name' => 'zoé', 'last_name' => 'MARTIN', 'agency_id' => '', 'phone' => ' ']);

    expect($agency->toArray())->toMatchArray(['name' => 'Marais', 'city' => null, 'website' => 'https://x.example'])
        ->and($agent->toArray())->toMatchArray(['first_name' => 'Zoé', 'last_name' => 'Martin', 'agency_id' => null, 'phone' => null]);
});

test('agency actions create, update and delete while broadcasting', function (): void {
    $by = User::factory()->create();

    $agency = resolve(CreateAgency::class)->handle(AgencyData::from(['name' => 'Marais']), $by);
    expect($agency->created_by)->toBe($by->id);
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->resource === 'agencies' && str_contains($event->message, 'Marais'));

    resolve(UpdateAgency::class)->handle($agency, AgencyData::from(['name' => 'Marais Nord']));
    expect($agency->refresh()->name)->toBe('Marais Nord');

    resolve(DeleteAgency::class)->handle($agency);
    expect(Agency::query()->count())->toBe(0);
    Event::assertDispatched(DashboardUpdated::class, 3);
});

test('agent actions create, update and delete while broadcasting', function (): void {
    $agency = Agency::factory()->create();

    $agent = resolve(CreateAgent::class)->handle(AgentData::from(['first_name' => 'zoé', 'last_name' => 'martin', 'agency_id' => $agency->id]));
    expect($agent->fullName())->toBe('Zoé Martin')
        ->and($agent->agency?->is($agency))->toBeTrue();
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->resource === 'agents' && str_contains($event->message, 'Zoé Martin'));

    resolve(UpdateAgent::class)->handle($agent, AgentData::from(['first_name' => 'Zoé', 'last_name' => 'Durand']));
    expect($agent->refresh()->last_name)->toBe('Durand');

    resolve(DeleteAgent::class)->handle($agent);
    expect(Agent::query()->count())->toBe(0);
    Event::assertDispatched(DashboardUpdated::class, 3);
});

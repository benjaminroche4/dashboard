<?php

declare(strict_types=1);

use App\Enums\AgentPosition;
use App\Models\Agent;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

test('free-text positions left in the database are normalised to enum values', function (): void {
    $agent = Agent::factory()->create(['position' => AgentPosition::Negotiator]);
    DB::table('agents')->where('id', $agent->id)->update(['position' => 'Directrice d’agence']);
    $unknown = Agent::factory()->create(['position' => null]);
    DB::table('agents')->where('id', $unknown->id)->update(['position' => 'Stagiaire']);

    Artisan::call('migrate:refresh', ['--path' => 'database/migrations/2026_09_07_190000_normalize_agent_positions.php', '--force' => true]);

    expect($agent->refresh()->position)->toBe(AgentPosition::AgencyDirector)
        ->and($unknown->refresh()->position)->toBe(AgentPosition::Other);
});

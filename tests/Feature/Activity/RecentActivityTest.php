<?php

declare(strict_types=1);

use App\Enums\AccessLevel;
use App\Enums\SiteSection;
use App\Http\Controllers\Tools\ActivityController;
use App\Models\Activity;
use App\Models\Lead;
use App\Models\User;

test('the bell menu receives the latest actions, most recent first, ten at most', function (): void {
    $actor = User::factory()->create(['name' => 'Chloé Martin']);
    $lead = Lead::factory()->create(['first_name' => 'Léa', 'last_name' => 'Durand']);
    Activity::factory()->count(12)->for($actor, 'actor')->create(['created_at' => now()->subDay()]);
    $latest = Activity::factory()->for($actor, 'actor')->create([
        'resource' => 'leads',
        'message' => 'a créé le lead Léa Durand',
        'lead_id' => $lead->id,
        'created_at' => now(),
    ]);

    $response = $this->actingAs($actor)->getJson(route('tools.activity.recent'))->assertOk();

    expect($response->json())->toHaveCount(ActivityController::RECENT)
        ->and($response->json('0.id'))->toBe($latest->id)
        ->and($response->json('0.message'))->toBe('a créé le lead Léa Durand')
        ->and($response->json('0.actor.name'))->toBe('Chloé Martin')
        ->and($response->json('0.lead.uuid'))->toBe($lead->uuid)
        ->and($response->json('0.resource_label'))->toBe('Leads');
});

test('the bell menu is closed to a member without the activity section', function (): void {
    $this->getJson(route('tools.activity.recent'))->assertUnauthorized();

    $member = User::factory()->create();
    $member->forceFill(['permissions' => [SiteSection::Activity->value => AccessLevel::None->value]])->save();

    $this->actingAs($member)->getJson(route('tools.activity.recent'))->assertForbidden();
});

<?php

declare(strict_types=1);

use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Support\Facades\Event;

beforeEach(function (): void {
    Event::fake([DashboardUpdated::class]);
});

test('a lead can be assigned to a staff member and released', function (): void {
    $lead = Lead::factory()->create();
    $member = User::factory()->create(['name' => 'Camille']);

    $this->actingAs(User::factory()->create())
        ->patch(route('leads.assign', $lead), ['user_id' => $member->id])
        ->assertRedirect();

    expect($lead->fresh()?->assigned_to)->toBe($member->id);
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => str_contains($event->message, 'Camille'));

    $this->actingAs(User::factory()->create())->patch(route('leads.assign', $lead), ['user_id' => null]);

    expect($lead->fresh()?->assigned_to)->toBeNull();

    $this->actingAs(User::factory()->create())
        ->patch(route('leads.assign', $lead), ['user_id' => 999])
        ->assertSessionHasErrors('user_id');
});

test('the index exposes the assignee of each lead', function (): void {
    $member = User::factory()->create(['name' => 'Camille']);
    Lead::factory()->assignedTo($member)->create(['first_name' => 'Léa', 'last_name' => 'Durand']);

    $this->actingAs($member)
        ->get(route('leads.index'))
        ->assertInertia(fn ($page) => $page->where('leads.0.assignee.name', 'Camille')->where('leads.0.assignee.id', $member->id));
});

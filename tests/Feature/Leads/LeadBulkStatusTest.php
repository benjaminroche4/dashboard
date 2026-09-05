<?php

declare(strict_types=1);

use App\Enums\LeadStatus;
use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Support\Facades\Event;

beforeEach(function (): void {
    Event::fake([DashboardUpdated::class]);
});

test('several leads can be moved to a column at once, on top and in the given order', function (): void {
    $existing = Lead::factory()->status(LeadStatus::Archived)->create(['position' => 0]);
    [$a, $b] = Lead::factory()->count(2)->sequence(['position' => 0], ['position' => 1])->create();

    $this->actingAs(User::factory()->create())
        ->from(route('leads.index'))
        ->patch(route('leads.bulk-status'), ['ids' => [$a->id, $b->id], 'status' => 'archived'])
        ->assertRedirect(route('leads.index'));

    $order = Lead::query()->where('status', LeadStatus::Archived)->orderBy('position')->pluck('id')->all();
    expect($order)->toBe([$a->id, $b->id, $existing->id])
        ->and($a->fresh()?->statusChanges()->count())->toBe(1);
    Event::assertDispatchedTimes(DashboardUpdated::class, 1);
});

test('the bulk move validates its ids and status', function (): void {
    $this->actingAs(User::factory()->create())
        ->patch(route('leads.bulk-status'), ['ids' => [999], 'status' => 'nope'])
        ->assertSessionHasErrors(['ids.0', 'status']);

    $this->actingAs(User::factory()->create())
        ->patch(route('leads.bulk-status'), ['ids' => [], 'status' => 'todo'])
        ->assertSessionHasErrors('ids');
});

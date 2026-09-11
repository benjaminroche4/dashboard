<?php

declare(strict_types=1);

use App\Enums\LeadLossReason;
use App\Enums\LeadStatus;
use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Support\Facades\Event;

beforeEach(function (): void {
    Event::fake([DashboardUpdated::class]);
});

test('archiving a lead requires a loss reason and stores it', function (): void {
    $lead = Lead::factory()->create(['status' => LeadStatus::InProgress]);
    $user = User::factory()->create();

    $this->actingAs($user)
        ->from(route('leads.show', $lead))
        ->patch(route('leads.status', $lead), ['status' => 'archived'])
        ->assertSessionHasErrors('loss_reason');

    $this->actingAs($user)
        ->patch(route('leads.status', $lead), ['status' => 'archived', 'loss_reason' => 'small_budget', 'loss_note' => 'Budget à 900 €.'])
        ->assertRedirect();

    $fresh = $lead->fresh();
    expect($fresh?->status)->toBe(LeadStatus::Archived)
        ->and($fresh?->loss_reason)->toBe(LeadLossReason::SmallBudget)
        ->and($fresh?->loss_note)->toBe('Budget à 900 €.');
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => str_contains($event->message, 'Trop petit budget'));
});

test('reviving an archived lead clears its loss reason, and the pages expose the options', function (): void {
    $lead = Lead::factory()->create(['status' => LeadStatus::Archived, 'loss_reason' => LeadLossReason::Other, 'loss_note' => 'x']);
    $user = User::factory()->create();

    $this->actingAs($user)
        ->patch(route('leads.status', $lead), ['status' => 'in_progress'])
        ->assertRedirect();

    expect($lead->fresh()?->loss_reason)->toBeNull()
        ->and($lead->fresh()?->loss_note)->toBeNull();

    $this->actingAs($user)->get(route('leads.index'))
        ->assertInertia(fn ($page) => $page->has('lossReasons', 5)->where('realtimeOnly', ['leads']));
    $this->actingAs($user)->get(route('leads.show', $lead))
        ->assertInertia(fn ($page) => $page->has('lossReasons', 5)->where('lead.loss_reason', null));
});

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

test('staff can move a lead to another status, which dates the last contact', function (): void {
    $lead = Lead::factory()->create();

    $this->actingAs(User::factory()->create())
        ->from(route('leads.index'))
        ->patch(route('leads.status', $lead), ['status' => 'contacted'])
        ->assertRedirect(route('leads.index'));

    expect($lead->fresh()?->status)->toBe(LeadStatus::Contacted)
        ->and($lead->fresh()?->last_contacted_at)->not->toBeNull();
    Event::assertDispatched(DashboardUpdated::class);
});

test('an unknown status is rejected', function (): void {
    $lead = Lead::factory()->create();

    $this->actingAs(User::factory()->create())
        ->patch(route('leads.status', $lead), ['status' => 'vip'])
        ->assertSessionHasErrors('status');

    expect($lead->fresh()?->status)->toBe(LeadStatus::New);
});

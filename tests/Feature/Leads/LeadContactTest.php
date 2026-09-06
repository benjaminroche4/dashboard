<?php

declare(strict_types=1);

use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Support\Facades\Event;

beforeEach(function (): void {
    Event::fake([DashboardUpdated::class]);
});

test('a staff member can mark a lead as contacted right now', function (): void {
    $lead = Lead::factory()->create(['last_contacted_at' => now()->subDays(5)]);

    $this->actingAs(User::factory()->create())
        ->patch(route('leads.contact', $lead))
        ->assertRedirect();

    expect($lead->fresh()?->last_contacted_at?->isSameMinute(now()))->toBeTrue();
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => str_contains($event->message, 'contact'));
});

test('guests cannot mark a lead as contacted', function (): void {
    $lead = Lead::factory()->create();

    $this->patch(route('leads.contact', $lead))->assertRedirect(route('login'));
});

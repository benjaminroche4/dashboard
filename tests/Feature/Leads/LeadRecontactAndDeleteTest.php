<?php

declare(strict_types=1);

use App\Enums\RecontactChannel;
use App\Enums\StaffRole;
use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\LeadNote;
use App\Models\User;
use Illuminate\Support\Facades\Event;

beforeEach(function (): void {
    Event::fake([DashboardUpdated::class]);
});

test('a recontact can be scheduled then cleared', function (): void {
    $lead = Lead::factory()->create();
    $user = User::factory()->create();

    $this->actingAs($user)
        ->patch(route('leads.recontact', $lead), ['recontact_at' => '2026-10-01', 'recontact_channel' => 'whatsapp'])
        ->assertRedirect();

    $fresh = $lead->fresh();
    expect($fresh?->recontact_at?->toDateString())->toBe('2026-10-01')
        ->and($fresh?->recontact_channel)->toBe(RecontactChannel::WhatsApp);

    $this->actingAs($user)
        ->patch(route('leads.recontact', $lead), ['recontact_at' => null, 'recontact_channel' => null])
        ->assertRedirect();

    expect($lead->fresh()?->recontact_at)->toBeNull();
});

test('a recontact date needs a channel', function (): void {
    $lead = Lead::factory()->create();

    $this->actingAs(User::factory()->create())
        ->from(route('leads.show', $lead))
        ->patch(route('leads.recontact', $lead), ['recontact_at' => '2026-10-01'])
        ->assertSessionHasErrors('recontact_channel');
});

test('only admins delete a lead, with its notes and history', function (): void {
    $lead = Lead::factory()->create();
    LeadNote::factory()->for($lead)->create();

    $this->actingAs(User::factory()->create(['role' => StaffRole::Manager]))
        ->delete(route('leads.destroy', $lead))
        ->assertForbidden();

    $this->actingAs(User::factory()->create(['role' => StaffRole::Admin]))
        ->delete(route('leads.destroy', $lead))
        ->assertRedirect(route('leads.index'));

    expect(Lead::query()->find($lead->id))->toBeNull()
        ->and(LeadNote::query()->where('lead_id', $lead->id)->count())->toBe(0);
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => ($event->payload['deleted'] ?? false) === true);
});

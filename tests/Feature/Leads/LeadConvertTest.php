<?php

declare(strict_types=1);

use App\Enums\LeadStatus;
use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Support\Facades\Event;

beforeEach(fn () => Event::fake([DashboardUpdated::class]));

test('a member converts a lead into a client: status, history, note, broadcast and redirect to the files', function (): void {
    $member = User::factory()->create();
    $lead = Lead::factory()->status(LeadStatus::QuoteSent)->create(['first_name' => 'Léa', 'last_name' => 'Durand']);

    $this->actingAs($member)
        ->post(route('leads.convert', $lead))
        ->assertRedirect(route('clients.index'))
        ->assertSessionHasNoErrors();

    $lead->refresh();
    expect($lead->status)->toBe(LeadStatus::Converted)
        ->and($lead->statusChanges()->latest('id')->first()?->to_status)->toBe(LeadStatus::Converted)
        ->and($lead->notes()->first()?->body)->toContain('converti en client');
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->resource === 'clients'
        && $event->message === 'a converti le lead Léa Durand en client');

    $this->actingAs($member)->get(route('clients.index'))->assertOk();
});

test('an already converted lead cannot be converted twice, and guests are redirected', function (): void {
    $lead = Lead::factory()->converted()->create();

    $this->post(route('leads.convert', $lead))->assertRedirect(route('login'));

    $this->actingAs(User::factory()->create())
        ->from(route('leads.show', $lead))
        ->post(route('leads.convert', $lead))
        ->assertRedirect(route('leads.show', $lead))
        ->assertSessionHasErrors('status');
});

test('a lead without an offer cannot become a client, by the button nor by the kanban', function (): void {
    $member = User::factory()->create();
    $lead = Lead::factory()->status(LeadStatus::InProgress)->create(['offer' => null]);

    $this->actingAs($member)
        ->from(route('leads.show', $lead))
        ->post(route('leads.convert', $lead))
        ->assertRedirect(route('leads.show', $lead))
        ->assertSessionHasErrors('offer');

    $this->actingAs($member)
        ->patch(route('leads.status', $lead), ['status' => LeadStatus::Converted->value])
        ->assertSessionHasErrors('offer');

    expect($lead->fresh()->status)->toBe(LeadStatus::InProgress);
});

test('a client file without an offer sends back to the lead to choose one', function (): void {
    $member = User::factory()->create();
    // Un client d'avant la règle : converti, mais sans formule.
    $lead = Lead::factory()->converted()->create(['offer' => null, 'first_name' => 'Léa', 'last_name' => 'Durand']);

    $this->actingAs($member)
        ->get(route('clients.show', $lead))
        ->assertRedirect(route('leads.show', $lead));
});

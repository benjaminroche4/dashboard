<?php

declare(strict_types=1);

use App\Enums\WebsiteHelpType;
use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Inertia\Testing\AssertableInertia;

beforeEach(function (): void {
    Event::fake([DashboardUpdated::class]);
});

test('a lead is moved to the owner leads, noted and broadcast, then moved back', function (): void {
    $lead = Lead::factory()->create();
    $user = User::factory()->create();

    $this->actingAs($user)
        ->patch(route('leads.segment', $lead), ['segment' => 'owner'])
        ->assertRedirect();

    expect($lead->refresh()->help_type)->toBe(WebsiteHelpType::RentalManagement)
        ->and($lead->notes()->latest()->value('body'))->toBe('Lead déplacé dans les Leads propriétaires.');
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->message === "a déplacé le lead {$lead->fullName()} dans les Leads propriétaires" && $event->actor['id'] === $user->id);

    $this->actingAs($user)
        ->patch(route('leads.segment', $lead), ['segment' => 'tenant'])
        ->assertRedirect();

    expect($lead->refresh()->help_type)->toBeNull()
        ->and($lead->notes()->count())->toBe(2);

    $this->actingAs($user)
        ->patch(route('leads.segment', $lead), ['segment' => 'buyer'])
        ->assertSessionHasErrors(['segment']);
});

test('moving a lead to the list it already belongs to changes nothing', function (): void {
    $lead = Lead::factory()->rentalManagement()->create();

    $this->actingAs(User::factory()->create())
        ->patch(route('leads.segment', $lead), ['segment' => 'owner'])
        ->assertRedirect();

    expect($lead->refresh()->notes()->count())->toBe(0);
    Event::assertNotDispatched(DashboardUpdated::class);
});

test('the lead page and the owner leads expose the segment', function (): void {
    $tenant = Lead::factory()->create();
    $owner = Lead::factory()->rentalManagement()->create();
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('leads.show', $tenant))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page->where('lead.segment', 'tenant'));

    $this->actingAs($user)
        ->get(route('owners.leads'))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page->where('leads.0.segment', 'owner'))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page->has('leads', 1));

    expect($owner->refresh()->help_type)->toBe(WebsiteHelpType::RentalManagement);
});

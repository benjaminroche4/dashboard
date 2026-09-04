<?php

declare(strict_types=1);

use App\Enums\LeadStatus;
use App\Enums\StaffRole;
use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Inertia\Testing\AssertableInertia;

beforeEach(function (): void {
    Event::fake([DashboardUpdated::class]);
});

test('the converting machine page lists offers, sources and currencies', function (): void {
    $this->actingAs(User::factory()->create(['role' => StaffRole::Member]))
        ->get(route('leads.create'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('leads/create')
            ->has('offers', 2)
            ->has('sources', 5)
            ->has('currencies', 2)
            ->where('defaultCurrency', 'EUR'));
});

test('any staff member can add a lead, which starts as new and is broadcast', function (): void {
    $user = User::factory()->create(['role' => StaffRole::Member]);

    $this->actingAs($user)
        ->post(route('leads.store'), [
            'first_name' => 'Léa',
            'last_name' => 'Durand',
            'email' => 'lea@example.com',
            'phone' => '',
            'offer' => 'confie',
            'arrival_at' => '2026-11-01',
            'budget_cents' => 250_000,
            'currency' => 'EUR',
            'origin_city' => 'Genève',
            'source' => 'referral',
            'message' => 'Arrive avec sa famille.',
            'score' => 4,
        ])
        ->assertRedirect(route('leads.index'));

    $lead = Lead::query()->sole();
    expect($lead->fullName())->toBe('Léa Durand')
        ->and($lead->status)->toBe(LeadStatus::Todo)
        ->and($lead->budget_cents)->toBe(250_000)
        ->and($lead->score)->toBe(4)
        ->and($lead->arrival_at?->toDateString())->toBe('2026-11-01')
        ->and($lead->created_by)->toBe($user->id);

    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->resource === 'leads');
});

test('a lead needs a name and at least one way to reach it', function (): void {
    $this->actingAs(User::factory()->create())
        ->from(route('leads.create'))
        ->post(route('leads.store'), ['first_name' => '', 'last_name' => 'X', 'email' => '', 'phone' => ''])
        ->assertRedirect(route('leads.create'))
        ->assertSessionHasErrors(['first_name', 'email', 'phone']);

    expect(Lead::query()->count())->toBe(0);
});

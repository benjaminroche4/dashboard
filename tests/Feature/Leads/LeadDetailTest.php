<?php

declare(strict_types=1);

use App\Enums\LeadStatus;
use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\LeadNote;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Inertia\Testing\AssertableInertia;

beforeEach(function (): void {
    Event::fake([DashboardUpdated::class]);
});

test('the detail page shows the lead, its notes and its status history', function (): void {
    $user = User::factory()->create(['name' => 'Admin']);
    $lead = Lead::factory()->create(['first_name' => 'Léa', 'last_name' => 'Durand']);
    $lead->statusChanges()->create(['from_status' => null, 'to_status' => LeadStatus::Todo, 'changed_by' => $user->id, 'created_at' => now()->subDay()]);
    LeadNote::factory()->for($lead)->for($user, 'author')->create(['body' => 'Rappeler mardi.']);

    $this->actingAs($user)
        ->get(route('leads.show', $lead))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('leads/show')
            ->where('lead.name', 'Léa Durand')
            ->where('lead.first_name', 'Léa')
            ->has('notes', 1)
            ->where('notes.0.body', 'Rappeler mardi.')
            ->where('notes.0.by', 'Admin')
            ->has('history', 1)
            ->where('history.0.to', 'À traiter')
            ->has('statuses', count(LeadStatus::cases())));
});

test('the edit page reuses the converting machine form with the lead prefilled', function (): void {
    $lead = Lead::factory()->create(['budget_cents' => 250_000, 'score' => 3]);

    $this->actingAs(User::factory()->create())
        ->get(route('leads.edit', $lead))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('leads/create')
            ->where('lead.id', $lead->id)
            ->where('lead.budget', '2500')
            ->where('lead.score', 3)
            ->has('offers', 2));
});

test('a lead can be updated and keeps its status and position', function (): void {
    $lead = Lead::factory()->status(LeadStatus::QuoteSent)->create(['position' => 2]);

    $this->actingAs(User::factory()->create())
        ->put(route('leads.update', $lead), [
            'first_name' => 'Marc',
            'last_name' => 'Petit',
            'email' => 'marc@example.com',
            'phone' => '',
            'offer' => 'accompagne',
            'currency' => 'CHF',
            'source' => 'partner',
            'score' => 5,
        ])
        ->assertRedirect(route('leads.show', $lead));

    $fresh = $lead->fresh();
    expect($fresh?->fullName())->toBe('Marc Petit')
        ->and($fresh?->score)->toBe(5)
        ->and($fresh?->status)->toBe(LeadStatus::QuoteSent)
        ->and($fresh?->position)->toBe(2);
    Event::assertDispatched(DashboardUpdated::class);
});

test('staff can add a note to a lead', function (): void {
    $lead = Lead::factory()->create();

    $this->actingAs(User::factory()->create())
        ->from(route('leads.show', $lead))
        ->post(route('leads.notes.store', $lead), ['body' => 'Très motivé.'])
        ->assertRedirect(route('leads.show', $lead));

    expect($lead->notes()->count())->toBe(1);

    $this->actingAs(User::factory()->create())
        ->post(route('leads.notes.store', $lead), ['body' => ''])
        ->assertSessionHasErrors('body');
});

test('the search endpoint finds leads by name or e-mail', function (): void {
    Lead::factory()->create(['first_name' => 'Zoé', 'last_name' => 'Martin', 'email' => 'zoe@example.com']);
    Lead::factory()->create(['first_name' => 'Paul', 'last_name' => 'Roux', 'email' => 'paul@example.com']);

    $this->actingAs(User::factory()->create())
        ->getJson(route('leads.search', ['q' => 'zoé mar']))
        ->assertOk()
        ->assertJsonCount(1)
        ->assertJsonPath('0.name', 'Zoé Martin');

    $this->actingAs(User::factory()->create())
        ->getJson(route('leads.search', ['q' => 'paul@']))
        ->assertJsonCount(1)
        ->assertJsonPath('0.email', 'paul@example.com');

    $this->actingAs(User::factory()->create())
        ->getJson(route('leads.search'))
        ->assertOk()
        ->assertExactJson([]);
});

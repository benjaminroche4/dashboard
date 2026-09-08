<?php

declare(strict_types=1);

use App\Enums\LeadStatus;
use App\Models\Lead;
use App\Models\User;
use Inertia\Testing\AssertableInertia;

test('guests are redirected to the login page', function (): void {
    $this->get(route('leads.index'))->assertRedirect(route('login'));
});

test('staff can list every lead with its status, newest first', function (): void {
    Lead::factory()->count(2)->create(['created_at' => now()->subDay()]);
    $latest = Lead::factory()->converted()->create(['first_name' => 'Zoé', 'last_name' => 'Martin']);

    $this->actingAs(User::factory()->create())
        ->get(route('leads.index'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('leads/index')
            ->has('leads', 3)
            ->where('leads.0.id', $latest->id)
            ->where('leads.0.name', 'Zoé Martin')
            ->where('leads.0.status', 'converted')
            ->where('leads.0.status_label', 'Converti')
            ->has('statuses', count(LeadStatus::cases())));
});

test('archived leads are left out until asked for, their count being exposed', function (): void {
    Lead::factory()->count(2)->create();
    Lead::factory()->status(LeadStatus::Archived)->count(3)->create();
    $member = User::factory()->create();

    $this->actingAs($member)
        ->get(route('leads.index'))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->has('leads', 2)
            ->where('archived.loaded', false)
            ->where('archived.count', 3));

    $this->actingAs($member)
        ->get(route('leads.index', ['archived' => 1]))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->has('leads', 5)
            ->where('archived.loaded', true)
            ->where('archived.count', 3));
});

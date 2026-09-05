<?php

declare(strict_types=1);

use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Support\Facades\Event;

beforeEach(function (): void {
    Event::fake([DashboardUpdated::class]);
});

test('duplicates are found by e-mail or by phone digits, excluding the lead being edited', function (): void {
    $lea = Lead::factory()->create(['first_name' => 'Léa', 'last_name' => 'Durand', 'email' => 'Lea@Example.com', 'phone' => '+33 6 12 34 56 78']);
    Lead::factory()->create(['email' => 'other@example.com', 'phone' => '+41 79 000 00 00']);
    $user = User::factory()->create();

    $this->actingAs($user)
        ->getJson(route('leads.duplicates', ['email' => 'lea@example.com']))
        ->assertOk()->assertJsonCount(1)->assertJsonPath('0.name', 'Léa Durand');

    $this->actingAs($user)
        ->getJson(route('leads.duplicates', ['phone' => '06 12 34 56 78']))
        ->assertOk()->assertJsonCount(1)->assertJsonPath('0.id', $lea->id);

    $this->actingAs($user)
        ->getJson(route('leads.duplicates', ['email' => 'lea@example.com', 'except' => $lea->id]))
        ->assertOk()->assertJsonCount(0);

    $this->actingAs($user)
        ->getJson(route('leads.duplicates', ['phone' => '06']))
        ->assertOk()->assertExactJson([]);
});

test('a lead can be assigned at creation', function (): void {
    $member = User::factory()->create();

    $this->actingAs(User::factory()->create())
        ->post(route('leads.store'), ['first_name' => 'Ana', 'last_name' => 'Silva', 'email' => 'ana@example.com', 'assigned_to' => $member->id]);

    expect(Lead::query()->sole()->assigned_to)->toBe($member->id);

    $this->actingAs(User::factory()->create())
        ->post(route('leads.store'), ['first_name' => 'Bob', 'last_name' => 'Roy', 'email' => 'bob@example.com', 'assigned_to' => 999])
        ->assertSessionHasErrors('assigned_to');
});

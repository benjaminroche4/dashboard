<?php

declare(strict_types=1);

use App\Enums\StaffRole;
use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\LeadNote;
use App\Models\User;
use Illuminate\Support\Facades\Event;

beforeEach(function (): void {
    Event::fake([DashboardUpdated::class]);
});

test('the author can edit and delete a fresh note', function (): void {
    $user = User::factory()->create();
    $lead = Lead::factory()->create();
    $note = LeadNote::factory()->for($lead)->for($user, 'author')->create(['body' => 'Brouillon']);

    $this->actingAs($user)
        ->patch(route('leads.notes.update', [$lead, $note]), ['body' => 'Corrigé'])
        ->assertRedirect();
    expect($note->fresh()?->body)->toBe('Corrigé');

    $this->actingAs($user)->delete(route('leads.notes.destroy', [$lead, $note]))->assertRedirect();
    expect(LeadNote::query()->find($note->id))->toBeNull();
});

test('a note older than the edit window is locked for its author but not for admins', function (): void {
    $author = User::factory()->create(['role' => StaffRole::Member]);
    $admin = User::factory()->create(['role' => StaffRole::Admin]);
    $lead = Lead::factory()->create();
    $note = LeadNote::factory()->for($lead)->for($author, 'author')->create(['created_at' => now()->subHour()]);

    $this->actingAs($author)->patch(route('leads.notes.update', [$lead, $note]), ['body' => 'Trop tard'])->assertForbidden();
    $this->actingAs($author)->delete(route('leads.notes.destroy', [$lead, $note]))->assertForbidden();
    $this->actingAs($admin)->delete(route('leads.notes.destroy', [$lead, $note]))->assertRedirect();

    expect(LeadNote::query()->find($note->id))->toBeNull();
});

test('someone else cannot touch a note, and the note must belong to the lead', function (): void {
    $author = User::factory()->create(['role' => StaffRole::Member]);
    $other = User::factory()->create(['role' => StaffRole::Member]);
    $lead = Lead::factory()->create();
    $otherLead = Lead::factory()->create();
    $note = LeadNote::factory()->for($lead)->for($author, 'author')->create();

    $this->actingAs($other)->patch(route('leads.notes.update', [$lead, $note]), ['body' => 'Non'])->assertForbidden();
    $this->actingAs($author)->patch(route('leads.notes.update', [$otherLead, $note]), ['body' => 'Non'])->assertNotFound();
});

test('the detail page tells which notes I can still edit and lists duplicates', function (): void {
    $user = User::factory()->create(['role' => StaffRole::Member]);
    $lead = Lead::factory()->create(['email' => 'lea@example.com', 'phone' => '+33 6 12 34 56 78']);
    $twin = Lead::factory()->create(['email' => 'LEA@example.com']);
    Lead::factory()->create(['email' => 'autre@example.com', 'phone' => null]);
    LeadNote::factory()->for($lead)->for($user, 'author')->create();
    LeadNote::factory()->for($lead)->for($user, 'author')->create(['created_at' => now()->subHour()]);

    $this->actingAs($user)
        ->get(route('leads.show', $lead))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('leads/show')
            ->has('duplicates', 1)
            ->where('duplicates.0.id', $twin->id)
            ->where('can.delete', false)
            ->has('recontactChannels', 4)
            ->where('notes.0.can_edit', true)
            ->where('notes.1.can_edit', false));
});

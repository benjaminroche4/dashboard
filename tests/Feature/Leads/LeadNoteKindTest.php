<?php

declare(strict_types=1);

use App\Actions\Leads\AddLeadNote;
use App\Enums\LeadNoteKind;
use App\Models\Lead;
use App\Models\User;
use Inertia\Testing\AssertableInertia;

it('marks a note written by a member as a team note', function (): void {
    $admin = User::factory()->staff()->create();
    $lead = Lead::factory()->create();

    $note = resolve(AddLeadNote::class)->handle($lead, 'Rappeler mardi.', $admin);

    expect($note->kind)->toBe(LeadNoteKind::Team);
});

it('marks a note posted by an action as tracking', function (): void {
    $admin = User::factory()->staff()->create();
    $lead = Lead::factory()->converted()->create();

    // Une Action pose sa note sans préciser la nature : le défaut est le suivi.
    $lead->notes()->create(['body' => 'Priorité du dossier : Haute.', 'user_id' => $admin->id]);

    expect($lead->notes()->latest('id')->first()?->kind)->toBe(LeadNoteKind::Tracking);
});

it('exposes the note kind to the lead page', function (): void {
    $admin = User::factory()->staff()->create();
    $lead = Lead::factory()->create();

    resolve(AddLeadNote::class)->handle($lead, 'Rappeler mardi.', $admin);
    $lead->notes()->create(['body' => 'Lead converti en client : le dossier est ouvert.', 'user_id' => $admin->id]);

    $this->actingAs($admin)
        ->get(route('leads.show', $lead))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->has('notes', 2)
            ->where('notes.0.kind', 'tracking')
            ->where('notes.1.kind', 'team'));
});

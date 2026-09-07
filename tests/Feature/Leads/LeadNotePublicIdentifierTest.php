<?php

declare(strict_types=1);

use App\Models\Lead;
use App\Models\LeadNote;
use App\Models\User;
use Illuminate\Support\Str;

test('une note reçoit un uuid à sa création', function (): void {
    $note = LeadNote::factory()->create();

    expect(Str::isUuid($note->uuid))->toBeTrue()
        ->and(LeadNote::factory()->create()->uuid)->not->toBe($note->uuid);
});

test("la fiche du lead expose l'uuid de chaque note et de l'agent en contact", function (): void {
    $staff = User::factory()->staff()->create();
    $lead = Lead::factory()->create();
    $note = LeadNote::factory()->create(['lead_id' => $lead->id, 'user_id' => $staff->id]);

    $this->actingAs($staff)->get(route('leads.show', $lead))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('notes.0.id', $note->id)
            ->where('notes.0.uuid', $note->uuid));
});

test("les routes d'une note portent l'uuid et refusent l'identifiant numérique", function (): void {
    $author = User::factory()->staff()->create();
    $lead = Lead::factory()->create();
    $note = LeadNote::factory()->create(['lead_id' => $lead->id, 'user_id' => $author->id]);

    expect(route('leads.notes.update', [$lead, $note]))->toEndWith("/leads/{$lead->uuid}/notes/{$note->uuid}");

    $this->actingAs($author)->patch("/leads/{$lead->uuid}/notes/{$note->id}", ['body' => 'Non'])->assertNotFound();
    $this->actingAs($author)->delete("/leads/{$lead->uuid}/notes/{$note->id}")->assertNotFound();
    $this->actingAs($author)->patch("/leads/{$lead->uuid}/notes/".Str::uuid(), ['body' => 'Non'])->assertNotFound();

    $this->actingAs($author)->patch("/leads/{$lead->uuid}/notes/{$note->uuid}", ['body' => 'Corrigé'])->assertRedirect();
    expect($note->refresh()->body)->toBe('Corrigé');

    $this->actingAs($author)->delete("/leads/{$lead->uuid}/notes/{$note->uuid}")->assertRedirect();
    expect(LeadNote::query()->find($note->id))->toBeNull();
});

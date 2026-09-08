<?php

declare(strict_types=1);

use App\Models\Lead;
use App\Models\User;
use Illuminate\Support\Str;

test('un lead reçoit un uuid à sa création', function (): void {
    $lead = Lead::factory()->create();

    expect($lead->uuid)->not->toBeNull()
        ->and(Str::isUuid($lead->uuid))->toBeTrue()
        ->and(Lead::factory()->create()->uuid)->not->toBe($lead->uuid);
});

test("l'url de la fiche porte l'uuid, jamais l'identifiant numérique", function (): void {
    $lead = Lead::factory()->create();

    expect(route('leads.show', $lead))->toEndWith('/locataires/'.$lead->uuid)
        ->and(route('leads.show', $lead))->not->toContain('/locataires/'.$lead->id);
});

test("la fiche s'ouvre par uuid et expose l'uuid au front", function (): void {
    $staff = User::factory()->staff()->create();
    $lead = Lead::factory()->create();

    $this->actingAs($staff)->get('/locataires/'.$lead->uuid)
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('leads/show')
            ->where('lead.id', $lead->id)
            ->where('lead.uuid', $lead->uuid));
});

test("l'identifiant numérique ne résout plus la fiche", function (): void {
    $staff = User::factory()->staff()->create();
    $lead = Lead::factory()->create();

    $this->actingAs($staff)->get('/locataires/'.$lead->id)->assertNotFound();
    $this->actingAs($staff)->get('/locataires/'.Str::uuid())->assertNotFound();
});

test('les recherches et doublons renvoient l\'uuid et une url par uuid', function (): void {
    $staff = User::factory()->staff()->create();
    $lead = Lead::factory()->create(['first_name' => 'Zoé', 'last_name' => 'Martin', 'email' => 'zoe@example.com']);

    $this->actingAs($staff)->getJson(route('leads.search', ['q' => 'zoé']))
        ->assertOk()
        ->assertJsonPath('0.uuid', $lead->uuid)
        ->assertJsonPath('0.url', route('leads.show', $lead));

    $this->actingAs($staff)->getJson(route('leads.duplicates', ['email' => 'zoe@example.com']))
        ->assertOk()
        ->assertJsonPath('0.uuid', $lead->uuid);
});

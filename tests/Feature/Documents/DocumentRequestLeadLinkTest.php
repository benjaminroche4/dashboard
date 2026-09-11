<?php

declare(strict_types=1);

use App\Events\DashboardUpdated;
use App\Models\DocumentRequest;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Inertia\Testing\AssertableInertia;

beforeEach(function (): void {
    Event::fake([DashboardUpdated::class]);
});

test('a list created without a lead can be linked to one from its page, then detached', function (): void {
    $member = User::factory()->create();
    $request = DocumentRequest::factory()->create(['lead_id' => null, 'first_name' => 'Océane', 'last_name' => 'Laurent']);
    $lead = Lead::factory()->create(['first_name' => 'Léa', 'last_name' => 'Durand']);

    // La fiche annonce qu'aucun lead n'est rattaché, et que le membre peut le faire.
    $this->actingAs($member)
        ->get(route('tools.documents.show', $request))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('request.lead', null)
            ->where('request.can_update', true));

    $this->actingAs($member)
        ->from(route('tools.documents.show', $request))
        ->patch(route('tools.documents.link', $request), ['lead_id' => $lead->id])
        ->assertRedirect(route('tools.documents.show', $request))
        ->assertSessionHasNoErrors();

    expect($request->fresh()->lead_id)->toBe($lead->id)
        ->and($lead->notes()->latest('id')->value('body'))->toBe('Liste de documents de Océane Laurent rattachée à ce lead.');
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->resource === 'documents'
        && str_contains((string) $event->message, 'a rattaché la liste de documents de Océane Laurent au lead Léa Durand'));

    // La fiche porte alors le lead, et le détachement le note aussi.
    $this->actingAs($member)
        ->get(route('tools.documents.show', $request))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page->where('request.lead.uuid', $lead->uuid));

    $this->actingAs($member)
        ->patch(route('tools.documents.link', $request), ['lead_id' => null])
        ->assertSessionHasNoErrors();

    expect($request->fresh()->lead_id)->toBeNull()
        ->and($lead->notes()->latest('id')->value('body'))->toBe('Liste de documents de Océane Laurent détachée de ce lead.');
});

test('an unknown lead is refused and the route uses the UUID', function (): void {
    $member = User::factory()->create();
    $request = DocumentRequest::factory()->create(['lead_id' => null]);

    $this->actingAs($member)
        ->from(route('tools.documents.show', $request))
        ->patch(route('tools.documents.link', $request), ['lead_id' => 999_999])
        ->assertSessionHasErrors('lead_id');

    $this->actingAs($member)
        ->patch("/tools/documents/{$request->id}/lead", ['lead_id' => null])
        ->assertNotFound();
});

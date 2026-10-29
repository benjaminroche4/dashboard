<?php

declare(strict_types=1);

use App\Enums\RelationshipQuality;
use App\Events\DashboardUpdated;
use App\Models\Partner;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;

beforeEach(function (): void {
    Event::fake([DashboardUpdated::class]);
    Http::fake();
});

test('a field of the partner is edited in place, the others untouched, nothing broadcast without a change', function (): void {
    $partner = Partner::factory()->create(['name' => 'Zen Assurances', 'phone' => '+33 1 00 00 00 00', 'email' => 'contact@zen.fr', 'notes' => null, 'relationship_quality' => null]);
    $user = User::factory()->create();

    $this->actingAs($user)
        ->patch(route('partners.fields', $partner), ['phone' => ' +33 1 42 00 00 00 ', 'notes' => 'Tarif négocié.', 'relationship_quality' => RelationshipQuality::Good->value])
        ->assertRedirect();

    $fresh = $partner->fresh();
    expect($fresh?->phone)->toBe('+33 1 42 00 00 00')
        ->and($fresh?->notes)->toBe('Tarif négocié.')
        ->and($fresh?->relationship_quality)->toBe(RelationshipQuality::Good)
        ->and($fresh?->email)->toBe('contact@zen.fr');
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->message === 'a modifié le téléphone, les notes, la qualité de la relation du partenaire Zen Assurances');

    Event::fake([DashboardUpdated::class]);
    $this->actingAs($user)
        ->patch(route('partners.fields', $partner), ['notes' => 'Tarif négocié.'])
        ->assertRedirect();
    Event::assertNotDispatched(DashboardUpdated::class);

    $this->actingAs($user)
        ->from(route('partners.show', $partner))
        ->patch(route('partners.fields', $partner), ['website' => 'pas-une-url', 'relationship_quality' => 'super'])
        ->assertSessionHasErrors(['website', 'relationship_quality']);
});

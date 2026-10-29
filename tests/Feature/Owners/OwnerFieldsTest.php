<?php

declare(strict_types=1);

use App\Events\DashboardUpdated;
use App\Models\Owner;
use App\Models\User;
use Illuminate\Support\Facades\Event;

beforeEach(fn () => Event::fake([DashboardUpdated::class]));

test('a field of the owner is edited in place, and the last way to reach them cannot be erased', function (): void {
    $owner = Owner::factory()->create(['first_name' => 'Zoé', 'last_name' => 'Martin', 'phone' => '+33 6 00 00 00 00', 'email' => null, 'notes' => null]);
    $user = User::factory()->create();

    $this->actingAs($user)
        ->patch(route('owners.fields', $owner), ['notes' => 'Deux studios dans le 11e.', 'city' => ' Lyon '])
        ->assertRedirect();

    $fresh = $owner->fresh();
    expect($fresh?->notes)->toBe('Deux studios dans le 11e.')
        ->and($fresh?->city)->toBe('Lyon')
        ->and($fresh?->phone)->toBe('+33 6 00 00 00 00');
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->message === 'a modifié l’adresse, les notes du propriétaire Zoé Martin');

    // Le seul moyen de contact ne s'efface pas.
    $this->actingAs($user)
        ->from(route('owners.show', $owner))
        ->patch(route('owners.fields', $owner), ['phone' => ''])
        ->assertSessionHasErrors(['phone']);
    expect($owner->fresh()?->phone)->toBe('+33 6 00 00 00 00');

    Event::fake([DashboardUpdated::class]);
    $this->actingAs($user)
        ->patch(route('owners.fields', $owner), ['notes' => 'Deux studios dans le 11e.'])
        ->assertRedirect();
    Event::assertNotDispatched(DashboardUpdated::class);
});

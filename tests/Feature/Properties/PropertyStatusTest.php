<?php

declare(strict_types=1);

use App\Enums\PropertyStatus;
use App\Events\DashboardUpdated;
use App\Models\Property;
use App\Models\User;
use Illuminate\Support\Facades\Event;

beforeEach(function (): void {
    Event::fake([DashboardUpdated::class]);
});

test('the availability changes in one gesture, without the full form', function (): void {
    $member = User::factory()->create();
    $property = Property::factory()->create([
        'title' => 'T4 lumineux · 20e',
        'status' => PropertyStatus::Available,
    ]);

    $this->actingAs($member)
        ->from(route('properties.show', $property))
        ->patch(route('properties.status', $property), ['status' => 'rented'])
        ->assertRedirect(route('properties.show', $property))
        ->assertSessionHasNoErrors();

    expect($property->fresh()->status)->toBe(PropertyStatus::Rented);
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->resource === 'properties'
        && $event->message === 'a passé le bien T4 lumineux · 20e en « Loué »');
});

test('an unchanged status is silent, and an unknown one is refused', function (): void {
    $member = User::factory()->create();
    $property = Property::factory()->create(['status' => PropertyStatus::Available]);

    $this->actingAs($member)
        ->patch(route('properties.status', $property), ['status' => 'available'])
        ->assertSessionHasNoErrors();

    Event::assertNotDispatched(DashboardUpdated::class);

    $this->actingAs($member)
        ->from(route('properties.show', $property))
        ->patch(route('properties.status', $property), ['status' => 'inconnu'])
        ->assertSessionHasErrors('status');

    // Route par UUID : l'entier répond 404.
    $this->actingAs($member)
        ->patch("/properties/{$property->id}/status", ['status' => 'rented'])
        ->assertNotFound();
});

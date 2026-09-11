<?php

declare(strict_types=1);

use App\Events\DashboardUpdated;
use App\Models\Property;
use App\Models\User;
use Illuminate\Support\Facades\Event;

beforeEach(function (): void {
    Event::fake([DashboardUpdated::class]);
});

test('a chosen photo becomes the cover, the others keeping their order', function (): void {
    $member = User::factory()->create();
    $property = Property::factory()->create([
        'title' => 'T4 lumineux · 20e',
        'photos' => ['properties/a.jpg', 'properties/b.jpg', 'properties/c.jpg'],
    ]);

    $this->actingAs($member)
        ->from(route('properties.show', $property))
        ->patch(route('properties.cover', $property), ['index' => 2])
        ->assertRedirect(route('properties.show', $property))
        ->assertSessionHasNoErrors();

    expect($property->fresh()->photos)->toBe([
        'properties/c.jpg',
        'properties/a.jpg',
        'properties/b.jpg',
    ]);
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->resource === 'properties'
        && $event->message === 'a changé la photo principale du bien T4 lumineux · 20e');
});

test('a photo the property does not have is refused, and choosing the first changes nothing', function (): void {
    $member = User::factory()->create();
    $property = Property::factory()->create(['photos' => ['properties/a.jpg', 'properties/b.jpg']]);

    $this->actingAs($member)
        ->from(route('properties.show', $property))
        ->patch(route('properties.cover', $property), ['index' => 5])
        ->assertSessionHasErrors('index');

    $this->actingAs($member)
        ->patch(route('properties.cover', $property), ['index' => 0])
        ->assertSessionHasNoErrors();

    expect($property->fresh()->photos)->toBe(['properties/a.jpg', 'properties/b.jpg']);

    // Route par UUID : l'entier répond 404.
    $this->actingAs($member)
        ->patch("/properties/{$property->id}/cover", ['index' => 1])
        ->assertNotFound();
});

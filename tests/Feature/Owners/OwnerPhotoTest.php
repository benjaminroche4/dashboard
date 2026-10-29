<?php

declare(strict_types=1);

use App\Enums\SiteSection;
use App\Events\DashboardUpdated;
use App\Models\Owner;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;

beforeEach(function (): void {
    Storage::fake('public');
    Event::fake([DashboardUpdated::class]);
    Http::fake();
});

test('a member who can edit owners uploads a photo, which replaces the previous file', function (): void {
    $owner = Owner::factory()->create(['first_name' => 'Zoé', 'last_name' => 'Martin']);
    $user = User::factory()->create();

    $this->actingAs($user)->from(route('owners.show', $owner))
        ->post(route('owners.photo.update', $owner), ['photo' => UploadedFile::fake()->image('photo.png', 200, 200)])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('owners.show', $owner));

    $first = $owner->refresh()->photo_path;
    expect($first)->toStartWith('owner-photos/')
        ->and($owner->photo)->not->toBeNull();
    Storage::disk('public')->assertExists($first);

    $this->actingAs($user)->post(route('owners.photo.update', $owner), ['photo' => UploadedFile::fake()->image('new.webp', 100, 100)])
        ->assertSessionHasNoErrors();

    $second = $owner->refresh()->photo_path;
    expect($second)->not->toBe($first);
    Storage::disk('public')->assertMissing($first);
    Storage::disk('public')->assertExists($second);
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->resource === 'owners'
        && $event->message === 'a changé la photo du propriétaire Zoé Martin');
});

test('the photo must be an image of at most 2 MB', function (): void {
    $owner = Owner::factory()->create();
    $user = User::factory()->create();

    $this->actingAs($user)->post(route('owners.photo.update', $owner), ['photo' => UploadedFile::fake()->create('photo.pdf', 100, 'application/pdf')])
        ->assertSessionHasErrors('photo');
    $this->actingAs($user)->post(route('owners.photo.update', $owner), ['photo' => UploadedFile::fake()->image('big.png')->size(3 * 1024)])
        ->assertSessionHasErrors('photo');

    expect($owner->refresh()->photo_path)->toBeNull();
});

test('the photo is removed with its file, and goes away with the owner', function (): void {
    Storage::disk('public')->put('owner-photos/a.png', 'png');
    $owner = Owner::factory()->create(['photo_path' => 'owner-photos/a.png']);
    $admin = User::factory()->create(['role' => 'admin']);

    $this->actingAs($admin)->delete(route('owners.photo.destroy', $owner))->assertSessionHasNoErrors();
    expect($owner->refresh()->photo_path)->toBeNull();
    Storage::disk('public')->assertMissing('owner-photos/a.png');

    Storage::disk('public')->put('owner-photos/b.png', 'png');
    $other = Owner::factory()->create(['photo_path' => 'owner-photos/b.png']);
    $this->actingAs($admin)->delete(route('owners.destroy', $other));
    Storage::disk('public')->assertMissing('owner-photos/b.png');
});

test('the detail page exposes the photo URL; a member in read-only cannot change it', function (): void {
    $owner = Owner::factory()->create(['photo_path' => 'owner-photos/a.png']);
    $reader = User::factory()->create(['role' => 'member', 'permissions' => [SiteSection::Owners->value => 'read']]);

    $this->actingAs($reader)->get(route('owners.show', $owner))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('owner.photo', Storage::disk('public')->url('owner-photos/a.png')));

    $this->actingAs($reader)->post(route('owners.photo.update', $owner), ['photo' => UploadedFile::fake()->image('photo.png')])->assertForbidden();
    $this->actingAs($reader)->delete(route('owners.photo.destroy', $owner))->assertForbidden();
});

<?php

declare(strict_types=1);

use App\Actions\Settings\RemoveProfileAvatar;
use App\Actions\Settings\UpdateProfileAvatar;
use App\Events\DashboardUpdated;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

beforeEach(function (): void {
    Storage::fake('public');
    Event::fake([DashboardUpdated::class]);
});

test('UpdateProfileAvatar stores the photo, exposes its URL and replaces the previous file', function (): void {
    $user = User::factory()->create();

    (new UpdateProfileAvatar)->handle($user, UploadedFile::fake()->image('first.png'));

    $first = $user->refresh()->avatar_path;
    expect($first)->toStartWith('avatars/')
        ->and($user->avatar)->toBe(Storage::disk('public')->url($first));
    Storage::disk('public')->assertExists($first);

    (new UpdateProfileAvatar)->handle($user, UploadedFile::fake()->image('second.jpg'));

    $second = $user->refresh()->avatar_path;
    expect($second)->not->toBe($first);
    Storage::disk('public')->assertMissing($first);
    Storage::disk('public')->assertExists($second);

    Event::assertDispatchedTimes(DashboardUpdated::class, 2);
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->resource === 'staff'
        && $event->message === 'a changé sa photo de profil');
});

test('RemoveProfileAvatar deletes the file and clears the path', function (): void {
    $user = User::factory()->create();
    (new UpdateProfileAvatar)->handle($user, UploadedFile::fake()->image('photo.png'));
    $path = $user->refresh()->avatar_path;

    (new RemoveProfileAvatar)->handle($user);

    expect($user->refresh()->avatar_path)->toBeNull()
        ->and($user->avatar)->toBeNull();
    Storage::disk('public')->assertMissing($path);
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->message === 'a retiré sa photo de profil');
});

test('RemoveProfileAvatar is a no-op without a photo', function (): void {
    $user = User::factory()->create();

    (new RemoveProfileAvatar)->handle($user);

    expect($user->refresh()->avatar_path)->toBeNull();
    Event::assertNotDispatched(DashboardUpdated::class);
});

test('a user without a photo has a null avatar in its JSON', function (): void {
    $user = User::factory()->create();

    expect($user->toArray())->toHaveKey('avatar')
        ->and($user->toArray()['avatar'])->toBeNull();
});

<?php

declare(strict_types=1);

use App\Events\DashboardUpdated;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;

beforeEach(function (): void {
    Storage::fake('public');
    Event::fake([DashboardUpdated::class]);
});

test('a staff member can upload a profile photo', function (): void {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post(route('profile.avatar.update'), [
        'avatar' => UploadedFile::fake()->image('me.png', 200, 200),
    ]);

    $response->assertSessionHasNoErrors()->assertRedirect(route('profile.edit'));

    $user->refresh();
    expect($user->avatar_path)->toStartWith('avatars/')
        ->and($user->avatar)->not->toBeNull();
    Storage::disk('public')->assertExists($user->avatar_path);
});

test('the shared auth props expose the avatar URL', function (): void {
    $user = User::factory()->create(['avatar_path' => 'avatars/me.png']);

    $this->actingAs($user)
        ->get(route('profile.edit'))
        ->assertInertia(fn ($page) => $page->where('auth.user.avatar', Storage::disk('public')->url('avatars/me.png')));
});

test('the photo must be an image of at most 2 MB', function (): void {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->from(route('profile.edit'))
        ->post(route('profile.avatar.update'), ['avatar' => UploadedFile::fake()->create('cv.pdf', 100, 'application/pdf')])
        ->assertSessionHasErrors('avatar');

    $this->actingAs($user)
        ->from(route('profile.edit'))
        ->post(route('profile.avatar.update'), ['avatar' => UploadedFile::fake()->image('huge.png')->size(3000)])
        ->assertSessionHasErrors('avatar');

    $this->actingAs($user)
        ->from(route('profile.edit'))
        ->post(route('profile.avatar.update'), [])
        ->assertSessionHasErrors('avatar');

    expect($user->refresh()->avatar_path)->toBeNull();
});

test('a staff member can remove their profile photo', function (): void {
    $user = User::factory()->create();
    Storage::disk('public')->put('avatars/me.png', 'png');
    $user->forceFill(['avatar_path' => 'avatars/me.png'])->save();

    $this->actingAs($user)
        ->delete(route('profile.avatar.destroy'))
        ->assertRedirect(route('profile.edit'));

    expect($user->refresh()->avatar_path)->toBeNull();
    Storage::disk('public')->assertMissing('avatars/me.png');
});

test('guests cannot touch profile photos', function (): void {
    $this->post(route('profile.avatar.update'))->assertRedirect(route('login'));
    $this->delete(route('profile.avatar.destroy'))->assertRedirect(route('login'));
});

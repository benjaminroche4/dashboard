<?php

namespace Tests\Feature\Settings;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProfileUpdateTest extends TestCase
{
    use RefreshDatabase;

    public function test_profile_page_is_displayed(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->get(route('profile.edit'));

        $response->assertOk();
    }

    public function test_profile_information_can_be_updated(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->patch(route('profile.update'), [
                'name' => 'Test User',
                'email' => 'test@example.com',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('profile.edit'));

        $user->refresh();

        $this->assertSame('Test User', $user->name);
        $this->assertSame('test@example.com', $user->email);
        $this->assertNull($user->email_verified_at);
    }

    public function test_email_verification_status_is_unchanged_when_the_email_address_is_unchanged(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->patch(route('profile.update'), [
                'name' => 'Test User',
                'email' => $user->email,
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('profile.edit'));

        $this->assertNotNull($user->refresh()->email_verified_at);
    }

    public function test_user_can_delete_their_account(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->delete(route('profile.destroy'), [
                'password' => 'password',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('home'));

        $this->assertGuest();
        $this->assertNull($user->fresh());
    }

    public function test_correct_password_must_be_provided_to_delete_account(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->from(route('profile.edit'))
            ->delete(route('profile.destroy'), [
                'password' => 'wrong-password',
            ]);

        $response
            ->assertSessionHasErrors('password')
            ->assertRedirect(route('profile.edit'));

        $this->assertNotNull($user->fresh());
    }
}

test('the profile name is capitalised on save', function (): void {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->patch(route('profile.update'), ['name' => 'benjamin ROCHE', 'email' => $user->email])
        ->assertSessionHasNoErrors();

    expect($user->refresh()->name)->toBe('Benjamin Roche');
});

test('the profile phone is saved for SMS alerts, blank clears it and an invalid number is refused', function (): void {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->patch(route('profile.update'), ['name' => $user->name, 'email' => $user->email, 'phone' => '+33 6 12 34 56 78'])
        ->assertSessionHasNoErrors();
    expect($user->refresh()->phone)->toBe('+33 6 12 34 56 78');

    $this->actingAs($user)
        ->from(route('profile.edit'))
        ->patch(route('profile.update'), ['name' => $user->name, 'email' => $user->email, 'phone' => '+33 12'])
        ->assertSessionHasErrors('phone');
    expect($user->refresh()->phone)->toBe('+33 6 12 34 56 78');

    $this->actingAs($user)
        ->patch(route('profile.update'), ['name' => $user->name, 'email' => $user->email, 'phone' => ''])
        ->assertSessionHasNoErrors();
    expect($user->refresh()->phone)->toBeNull();

    $this->actingAs($user)->get(route('profile.edit'))
        ->assertInertia(fn ($page) => $page->where('auth.user.phone', null));
});

<?php

declare(strict_types=1);

use App\Models\User;
use Laravel\Socialite\Contracts\Provider;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as SocialiteUser;

/** Identifiants OAuth présents : la connexion Google est proposée. */
function configureGoogle(): void
{
    config(['services.google.client_id' => 'client-id', 'services.google.client_secret' => 'secret']);
}

/** Compte Google renvoyé par le provider, quel que soit l'e-mail. */
function fakeGoogleAccount(string $email): void
{
    $account = (new SocialiteUser)->map(['id' => 'google-1', 'name' => 'Membre', 'email' => $email]);

    $provider = Mockery::mock(Provider::class);
    $provider->shouldReceive('user')->andReturn($account);
    Socialite::shouldReceive('driver')->with('google')->andReturn($provider);
}

test('an existing member signs in with Google', function (): void {
    configureGoogle();
    $user = User::factory()->staff()->create(['email' => 'charles@relocation-in-paris.fr']);
    fakeGoogleAccount('Charles@Relocation-In-Paris.fr');

    $this->get(route('auth.google.callback'))->assertRedirect(route('dashboard'));

    $this->assertAuthenticatedAs($user);
});

test('an unknown Google account is refused: the backoffice has no sign-up', function (): void {
    configureGoogle();
    fakeGoogleAccount('inconnu@example.com');

    $this->get(route('auth.google.callback'))
        ->assertRedirect(route('login'))
        ->assertSessionHasErrors('email');

    $this->assertGuest();
    expect(User::query()->where('email', 'inconnu@example.com')->exists())->toBeFalse();
});

test('a Google account outside the allowed domains is refused', function (): void {
    configureGoogle();
    config(['services.google.allowed_domains' => 'relocation-in-paris.fr']);
    User::factory()->staff()->create(['email' => 'membre@example.com']);
    fakeGoogleAccount('membre@example.com');

    $this->get(route('auth.google.callback'))
        ->assertRedirect(route('login'))
        ->assertSessionHasErrors('email');

    $this->assertGuest();
});

test('a member with two-factor authentication still goes through the challenge', function (): void {
    configureGoogle();
    $user = User::factory()->staff()->withTwoFactor()->create(['email' => 'admin@relocation-in-paris.fr']);
    fakeGoogleAccount('admin@relocation-in-paris.fr');

    $this->get(route('auth.google.callback'))->assertRedirect(route('two-factor.login'));

    $this->assertGuest();
    expect(session('login.id'))->toBe($user->id);
});

test('the Google routes answer 404 without OAuth credentials', function (): void {
    config(['services.google.client_id' => null, 'services.google.client_secret' => null]);

    $this->get(route('auth.google.redirect'))->assertNotFound();
    $this->get(route('auth.google.callback'))->assertNotFound();
});

test('the login page says whether Google sign-in is available', function (): void {
    configureGoogle();

    $this->get(route('login'))->assertInertia(fn ($page) => $page->where('features.googleLogin', true));

    config(['services.google.client_id' => null]);

    $this->get(route('login'))->assertInertia(fn ($page) => $page->where('features.googleLogin', false));
});

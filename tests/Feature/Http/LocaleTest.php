<?php

declare(strict_types=1);

use App\Models\User;

test('the application runs in French', function (): void {
    expect(app()->getLocale())->toBe('fr')
        ->and(config('app.fallback_locale'))->toBe('fr');
});

test('validation errors are returned in French', function (): void {
    $this->from(route('login'))
        ->post(route('login.store'), ['email' => 'nope@example.com', 'password' => ''])
        ->assertSessionHasErrors(['password' => 'Le champ mot de passe est obligatoire.']);
});

test('failed logins are explained in French', function (): void {
    $user = User::factory()->create();

    $this->from(route('login'))
        ->post(route('login.store'), ['email' => $user->email, 'password' => 'wrong-password'])
        ->assertSessionHasErrors('email');

    expect(session('errors')->first('email'))->toBe(__('auth.failed'))
        ->and(__('auth.failed'))->toContain('identifiants');
});

test('flash messages are translated', function (): void {
    expect(__('Profile updated.'))->toBe('Profil mis à jour.')
        ->and(__('Password updated.'))->toBe('Mot de passe mis à jour.');
});

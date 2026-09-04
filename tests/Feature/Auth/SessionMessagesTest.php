<?php

declare(strict_types=1);

use App\Models\User;

test('logging out sends the user back to the login page with a message', function (): void {
    $this->actingAs(User::factory()->create())
        ->post(route('logout'))
        ->assertRedirect(route('login'))
        ->assertSessionHas('status', 'Vous avez été déconnecté.');
});

test('an expired session on a protected page is explained', function (): void {
    $this->withCookie(config('session.cookie'), 'stale')
        ->get(route('dashboard'))
        ->assertRedirect(route('login'))
        ->assertSessionHas('status', 'Votre session a expiré, veuillez vous reconnecter.');
});

test('a first-time visitor on a protected page gets no expiry message', function (): void {
    $this->get(route('dashboard'))
        ->assertRedirect(route('login'))
        ->assertSessionMissing('status');
});

test('the root redirect never carries an expiry message', function (): void {
    $this->withCookie(config('session.cookie'), 'stale')
        ->get('/')
        ->assertRedirect(route('login'))
        ->assertSessionMissing('status');
});

test('the login page exposes the status to the front-end', function (): void {
    $this->withSession(['status' => 'Vous avez été déconnecté.'])
        ->get(route('login'))
        ->assertInertia(fn ($page) => $page->where('status', 'Vous avez été déconnecté.'));
});

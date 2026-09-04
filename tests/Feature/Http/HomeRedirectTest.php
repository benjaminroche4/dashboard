<?php

use App\Models\User;

test('guests are redirected from the root to the login page', function () {
    $this->get('/')->assertRedirect(route('login'));
});

test('authenticated staff are redirected from the root to the dashboard', function () {
    $this->actingAs(User::factory()->create())
        ->get('/')
        ->assertRedirect(route('dashboard'));
});

test('the login page is the only public page', function () {
    $this->get(route('login'))->assertOk();
    $this->get('/register')->assertNotFound();
    $this->get('/forgot-password')->assertNotFound();
    $this->get(route('dashboard'))->assertRedirect(route('login'));
});

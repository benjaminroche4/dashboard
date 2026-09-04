<?php

declare(strict_types=1);

use App\Enums\StaffRole;
use App\Models\User;

test('staff:create creates a user from options', function (): void {
    $this->artisan('staff:create', [
        '--name' => 'Bob',
        '--email' => 'bob@example.com',
        '--password' => 'Sup3r-secret-pass',
        '--no-interaction' => true,
    ])->assertSuccessful();

    expect(User::where('email', 'bob@example.com')->exists())->toBeTrue();
});

test('staff:create fails with validation errors', function (): void {
    $this->artisan('staff:create', [
        '--name' => 'Bob',
        '--email' => 'nope',
        '--password' => 'Sup3r-secret-pass',
        '--no-interaction' => true,
    ])->assertFailed();

    expect(User::count())->toBe(0);
});

test('staff:create accepts a role', function (): void {
    $this->artisan('staff:create', [
        '--name' => 'Bob',
        '--email' => 'bob@example.com',
        '--password' => 'Sup3r-secret-pass',
        '--role' => 'manager',
    ])->assertSuccessful();

    expect(User::where('email', 'bob@example.com')->first()->role)->toBe(StaffRole::Manager);
});

test('staff:create defaults to the member role', function (): void {
    $this->artisan('staff:create', [
        '--name' => 'Bob',
        '--email' => 'bob@example.com',
        '--password' => 'Sup3r-secret-pass',
        '--no-interaction' => true,
    ])->assertSuccessful();

    expect(User::where('email', 'bob@example.com')->first()->role)->toBe(StaffRole::Member);
});

test('staff:create rejects an unknown role', function (): void {
    $this->artisan('staff:create', [
        '--name' => 'Bob',
        '--email' => 'bob@example.com',
        '--password' => 'Sup3r-secret-pass',
        '--role' => 'god',
    ])->assertFailed();

    expect(User::count())->toBe(0);
});

test('staff:create asks for the role interactively', function (): void {
    $this->artisan('staff:create', [
        '--name' => 'Bob',
        '--email' => 'bob@example.com',
        '--password' => 'Sup3r-secret-pass',
    ])
        ->expectsChoice('Rôle', 'admin', ['admin' => 'Administrateur', 'manager' => 'Manager', 'member' => 'Membre'])
        ->assertSuccessful();

    expect(User::where('email', 'bob@example.com')->first()->role)->toBe(StaffRole::Admin);
});

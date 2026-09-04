<?php

declare(strict_types=1);

use App\Models\User;

test('staff:create creates a user from options', function (): void {
    $this->artisan('staff:create', [
        '--name' => 'Bob',
        '--email' => 'bob@example.com',
        '--password' => 'Sup3r-secret-pass',
    ])->assertSuccessful();

    expect(User::where('email', 'bob@example.com')->exists())->toBeTrue();
});

test('staff:create fails with validation errors', function (): void {
    $this->artisan('staff:create', [
        '--name' => 'Bob',
        '--email' => 'nope',
        '--password' => 'Sup3r-secret-pass',
    ])->assertFailed();

    expect(User::count())->toBe(0);
});

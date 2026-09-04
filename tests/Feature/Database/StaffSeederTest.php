<?php

declare(strict_types=1);

use App\Models\User;
use Database\Seeders\StaffSeeder;
use Illuminate\Support\Facades\Hash;

test('the staff seeder creates both admin accounts with the "admin" password', function (): void {
    $this->seed(StaffSeeder::class);

    foreach (['admin@admin.fr', 'admin2@admin.fr'] as $email) {
        $user = User::where('email', $email)->first();

        expect($user)->not->toBeNull()
            ->and(Hash::check('admin', $user->password))->toBeTrue();
    }
});

test('the database seeder runs the fixtures outside production only', function (): void {
    $this->seed();

    expect(User::count())->toBe(count(StaffSeeder::ACCOUNTS));
});

test('the admin accounts can log in', function (): void {
    $this->seed(StaffSeeder::class);

    $this->post(route('login.store'), [
        'email' => 'admin@admin.fr',
        'password' => 'admin',
    ])->assertRedirect(route('dashboard'));

    $this->assertAuthenticated();
});

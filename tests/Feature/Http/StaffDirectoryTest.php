<?php

declare(strict_types=1);

use App\Enums\StaffRole;
use App\Models\User;
use Inertia\Testing\AssertableInertia;

test('the staff directory is shared with authenticated pages', function (): void {
    $admin = User::factory()->admin()->create(['name' => 'Zoé']);
    User::factory()->role(StaffRole::Manager)->create(['name' => 'Alice']);

    $this->actingAs($admin)
        ->get(route('dashboard'))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->has('staff', 2)
            ->where('staff.0.name', 'Alice')
            ->where('staff.0.role', 'manager')
            ->where('staff.1.name', 'Zoé')
            ->where('staff.1.role', 'admin'));
});

test('the staff directory exposes no sensitive fields', function (): void {
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)
        ->get(route('dashboard'))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->has('staff.0', fn (AssertableInertia $entry): AssertableInertia => $entry
                ->hasAll(['id', 'name', 'role'])
                ->missingAll(['email', 'password', 'two_factor_secret'])));
});

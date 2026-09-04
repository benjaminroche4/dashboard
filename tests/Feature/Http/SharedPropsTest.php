<?php

declare(strict_types=1);

use App\Models\User;
use Inertia\Testing\AssertableInertia;

test('the role and permissions are shared with the front-end', function (): void {
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)
        ->get(route('dashboard'))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('auth.user.role', 'admin')
            ->where('auth.can.manageStaff', true)
            ->where('auth.can.viewPulse', true));
});

test('members get no management permissions', function (): void {
    $this->actingAs(User::factory()->create())
        ->get(route('dashboard'))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('auth.user.role', 'member')
            ->where('auth.can.manageStaff', false)
            ->where('auth.can.viewPulse', false));
});

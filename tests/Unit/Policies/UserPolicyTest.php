<?php

declare(strict_types=1);

use App\Enums\StaffRole;
use App\Models\User;
use App\Policies\UserPolicy;

function userWithRole(StaffRole $role, int $id): User
{
    $user = new User(['name' => 'X', 'email' => "$id@example.com", 'role' => $role]);
    $user->id = $id;

    return $user;
}

test('admins manage the staff', function (): void {
    $admin = userWithRole(StaffRole::Admin, 1);
    $other = userWithRole(StaffRole::Member, 2);
    $policy = new UserPolicy;

    expect($policy->viewAny($admin))->toBeTrue()
        ->and($policy->create($admin))->toBeTrue()
        ->and($policy->view($admin, $other))->toBeTrue()
        ->and($policy->update($admin, $other))->toBeTrue()
        ->and($policy->updateRole($admin, $other))->toBeTrue()
        ->and($policy->delete($admin, $other))->toBeTrue();
});

test('admins cannot change their own role nor delete themselves', function (): void {
    $admin = userWithRole(StaffRole::Admin, 1);
    $policy = new UserPolicy;

    expect($policy->updateRole($admin, $admin))->toBeFalse()
        ->and($policy->delete($admin, $admin))->toBeFalse();
});

test('members and managers only see and update themselves', function (StaffRole $role): void {
    $me = userWithRole($role, 1);
    $other = userWithRole(StaffRole::Member, 2);
    $policy = new UserPolicy;

    expect($policy->viewAny($me))->toBeFalse()
        ->and($policy->create($me))->toBeFalse()
        ->and($policy->view($me, $me))->toBeTrue()
        ->and($policy->view($me, $other))->toBeFalse()
        ->and($policy->update($me, $me))->toBeTrue()
        ->and($policy->update($me, $other))->toBeFalse()
        ->and($policy->delete($me, $other))->toBeFalse();
})->with([StaffRole::Manager, StaffRole::Member]);

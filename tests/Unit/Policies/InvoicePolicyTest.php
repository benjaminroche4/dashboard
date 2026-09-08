<?php

declare(strict_types=1);

use App\Enums\StaffRole;
use App\Models\User;
use App\Policies\InvoicePolicy;

function staffWithRole(StaffRole $role): User
{
    return new User(['name' => 'X', 'email' => 'x@example.com', 'role' => $role]);
}

test('everyone on the staff can view invoices', function (StaffRole $role): void {
    $policy = new InvoicePolicy;

    expect($policy->viewAny(staffWithRole($role)))->toBeTrue()
        ->and($policy->view(staffWithRole($role)))->toBeTrue();
})->with(StaffRole::cases());

test('managers and admins manage invoices, only admins delete', function (): void {
    $policy = new InvoicePolicy;

    expect($policy->create(staffWithRole(StaffRole::Member)))->toBeFalse()
        ->and($policy->create(staffWithRole(StaffRole::Manager)))->toBeTrue()
        ->and($policy->update(staffWithRole(StaffRole::Admin)))->toBeTrue()
        ->and($policy->delete(staffWithRole(StaffRole::Manager)))->toBeFalse()
        ->and($policy->delete(staffWithRole(StaffRole::Admin)))->toBeTrue();
});

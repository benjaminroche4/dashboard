<?php

declare(strict_types=1);

use App\Enums\StaffRole;

test('every role has a label', function (): void {
    foreach (StaffRole::cases() as $role) {
        expect($role->label())->not->toBeEmpty();
    }
});

test('only admin is admin', function (): void {
    expect(StaffRole::Admin->isAdmin())->toBeTrue()
        ->and(StaffRole::Manager->isAdmin())->toBeFalse()
        ->and(StaffRole::Member->isAdmin())->toBeFalse();
});

test('roles are ordered from most to least privileged', function (): void {
    expect(StaffRole::Admin->atLeast(StaffRole::Member))->toBeTrue()
        ->and(StaffRole::Manager->atLeast(StaffRole::Member))->toBeTrue()
        ->and(StaffRole::Manager->atLeast(StaffRole::Admin))->toBeFalse()
        ->and(StaffRole::Member->atLeast(StaffRole::Member))->toBeTrue();
});

test('values lists the string values', function (): void {
    expect(StaffRole::values())->toBe(['admin', 'manager', 'member']);
});

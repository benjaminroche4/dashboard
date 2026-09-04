<?php

use App\Actions\Staff\CreateStaffMember;
use App\Data\StaffMemberData;
use App\Enums\StaffRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

test('it creates a staff member with a hashed password', function (): void {
    $user = (new CreateStaffMember)->handle(new StaffMemberData('Alice', 'alice@example.com', 'Sup3r-secret-pass'));

    expect($user)->toBeInstanceOf(User::class)
        ->and($user->email)->toBe('alice@example.com')
        ->and(Hash::check('Sup3r-secret-pass', $user->password))->toBeTrue();
});

test('it rejects an invalid email', function (): void {
    (new CreateStaffMember)->handle(new StaffMemberData('Alice', 'not-an-email', 'Sup3r-secret-pass'));
})->throws(ValidationException::class);

test('it rejects a duplicate email', function (): void {
    User::factory()->create(['email' => 'alice@example.com']);

    (new CreateStaffMember)->handle(new StaffMemberData('Alice', 'alice@example.com', 'Sup3r-secret-pass'));
})->throws(ValidationException::class);

test('it rejects a weak password', function (): void {
    (new CreateStaffMember)->handle(new StaffMemberData('Alice', 'alice@example.com', 'short'));
})->throws(ValidationException::class);

test('it stores the requested role', function (): void {
    $user = (new CreateStaffMember)->handle(new StaffMemberData('Alice', 'alice@example.com', 'Sup3r-secret-pass', StaffRole::Manager));

    expect($user->refresh()->role)->toBe(StaffRole::Manager);
});

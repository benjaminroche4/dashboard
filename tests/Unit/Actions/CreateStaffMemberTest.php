<?php

use App\Actions\Staff\CreateStaffMember;
use App\Actions\Staff\DeleteStaffMember;
use App\Data\StaffMemberData;
use App\Enums\StaffRole;
use App\Events\DashboardUpdated;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
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

test('it broadcasts the new member to the team and deletes a member', function (): void {
    Event::fake([DashboardUpdated::class]);
    $admin = User::factory()->admin()->create();

    $user = (new CreateStaffMember)->handle(new StaffMemberData('Alice', 'alice@example.com', 'Sup3r-secret-pass'), $admin);
    Event::assertDispatched(DashboardUpdated::class, fn ($event): bool => $event->resource === 'staff' && $event->payload === ['id' => $user->id]);

    (new DeleteStaffMember)->handle($user, $admin);
    expect(User::query()->find($user->id))->toBeNull()
        ->and($user->uuid)->not->toBeEmpty();
});

<?php

declare(strict_types=1);

use App\Enums\StaffRole;
use App\Models\User;
use Illuminate\Support\Facades\Route;

beforeEach(function (): void {
    Route::middleware(['web', 'auth', 'role:admin,manager'])
        ->get('/_test/managers-only', fn (): string => 'ok');
});

test('guests get a 401 on role-protected routes', function (): void {
    $this->getJson('/_test/managers-only')->assertUnauthorized();
});

test('allowed roles pass', function (StaffRole $role): void {
    $this->actingAs(User::factory()->role($role)->create())
        ->get('/_test/managers-only')
        ->assertOk();
})->with([StaffRole::Admin, StaffRole::Manager]);

test('other roles get a 403', function (): void {
    $this->actingAs(User::factory()->role(StaffRole::Member)->create())
        ->get('/_test/managers-only')
        ->assertForbidden();
});

test('the policy is discovered for the user model', function (): void {
    $admin = User::factory()->admin()->create();
    $member = User::factory()->create();

    expect($admin->can('viewAny', User::class))->toBeTrue()
        ->and($member->can('viewAny', User::class))->toBeFalse();
});

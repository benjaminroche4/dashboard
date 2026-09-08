<?php

declare(strict_types=1);

use App\Enums\StaffRole;
use App\Events\DashboardUpdated;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia;

beforeEach(fn () => Event::fake([DashboardUpdated::class]));

test('the team page lists the members with role, 2FA and rights, for admins only', function (): void {
    $admin = User::factory()->admin()->create(['name' => 'Admin']);
    $manager = User::factory()->manager()->withTwoFactor()->create(['name' => 'Chloé Martin']);
    $member = User::factory()->create(['name' => 'Zoé Petit']);

    $this->get(route('team.index'))->assertRedirect(route('login'));
    $this->actingAs($manager)->get(route('team.index'))->assertForbidden();
    $this->actingAs($member)->get(route('team.index'))->assertForbidden();

    $this->actingAs($admin)
        ->get(route('team.index'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('settings/team')
            ->has('members', 3)
            ->where('members.0.name', 'Admin')
            ->where('members.0.uuid', $admin->uuid)
            ->where('members.0.role', 'admin')
            ->where('members.0.role_label', 'Administrateur')
            ->where('members.0.is_me', true)
            ->where('members.0.can_delete', false)
            ->where('members.0.two_factor_enabled', false)
            ->where('members.1.name', 'Chloé Martin')
            ->where('members.1.two_factor_enabled', true)
            ->where('members.1.can_delete', true)
            ->has('roles', 3)
            ->where('realtimeOnly', ['members']));
});

test('an admin adds a member with a capitalised name, a confirmed password and a role', function (): void {
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)
        ->from(route('team.index'))
        ->post(route('team.store'), ['name' => 'jean dupont', 'email' => 'jean@example.com', 'password' => 'Sup3r-secret-pass', 'password_confirmation' => 'autre', 'role' => 'manager'])
        ->assertRedirect(route('team.index'))
        ->assertSessionHasErrors(['password']);

    $this->actingAs($admin)
        ->from(route('team.index'))
        ->post(route('team.store'), ['name' => 'jean dupont', 'email' => 'jean@example.com', 'password' => 'Sup3r-secret-pass', 'password_confirmation' => 'Sup3r-secret-pass', 'role' => 'manager'])
        ->assertRedirect(route('team.index'))
        ->assertSessionHasNoErrors();

    $member = User::query()->where('email', 'jean@example.com')->firstOrFail();
    expect($member->name)->toBe('Jean Dupont')
        ->and($member->role)->toBe(StaffRole::Manager)
        ->and(Hash::check('Sup3r-secret-pass', $member->password))->toBeTrue();
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->resource === 'staff'
        && $event->message === "a ajouté Jean Dupont à l'équipe"
        && $event->actor['id'] === $admin->id);

    $this->actingAs($admin)
        ->from(route('team.index'))
        ->post(route('team.store'), ['name' => 'Autre', 'email' => 'jean@example.com', 'password' => 'Sup3r-secret-pass', 'password_confirmation' => 'Sup3r-secret-pass', 'role' => 'member'])
        ->assertSessionHasErrors(['email']);
});

test('only admins add members', function (): void {
    $this->actingAs(User::factory()->manager()->create())
        ->post(route('team.store'), ['name' => 'Jean', 'email' => 'jean@example.com', 'password' => 'Sup3r-secret-pass', 'password_confirmation' => 'Sup3r-secret-pass', 'role' => 'member'])
        ->assertForbidden();

    expect(User::query()->where('email', 'jean@example.com')->exists())->toBeFalse();
});

test('an admin removes another member but never their own access', function (): void {
    $admin = User::factory()->admin()->create();
    $member = User::factory()->create(['name' => 'Chloé Martin']);

    $this->actingAs($admin)->delete(route('team.destroy', $admin))->assertForbidden();
    expect($admin->fresh())->not->toBeNull();

    $this->actingAs($admin)
        ->from(route('team.index'))
        ->delete(route('team.destroy', $member))
        ->assertRedirect(route('team.index'));

    expect(User::query()->find($member->id))->toBeNull();
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->resource === 'staff'
        && $event->message === "a retiré l'accès de Chloé Martin"
        && ($event->payload['deleted'] ?? false) === true);
});

test('team routes use the UUID and refuse the numeric id', function (): void {
    $admin = User::factory()->admin()->create();
    $member = User::factory()->create();

    $this->actingAs($admin)->delete("/settings/team/{$member->id}")->assertNotFound();
    $this->actingAs($admin)->delete("/settings/team/{$member->uuid}")->assertRedirect();
});

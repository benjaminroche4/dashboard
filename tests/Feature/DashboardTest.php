<?php

declare(strict_types=1);

use App\Enums\AccessLevel;
use App\Enums\SiteSection;
use App\Enums\StaffRole;
use App\Models\User;

test('guests are redirected to the login page', function (): void {
    $this->get(route('dashboard'))->assertRedirect(route('login'));
});

test('the dashboard is no longer a page: it leads to the tenant leads', function (): void {
    $this->actingAs(User::factory()->create())
        ->get(route('dashboard'))
        ->assertRedirect(route('leads.index'));
});

test('a member without the leads goes to the first list open to them', function (): void {
    $member = User::factory()->create([
        'role' => StaffRole::Member,
        'permissions' => [
            SiteSection::Leads->value => AccessLevel::None->value,
            SiteSection::OwnerLeads->value => AccessLevel::None->value,
        ],
    ]);

    $this->actingAs($member)->get(route('dashboard'))->assertRedirect(route('clients.index'));
});

test('a member with every list closed lands on their profile', function (): void {
    $member = User::factory()->create([
        'role' => StaffRole::Member,
        'permissions' => collect(SiteSection::cases())
            ->mapWithKeys(fn (SiteSection $section): array => [$section->value => AccessLevel::None->value])
            ->all(),
    ]);

    $this->actingAs($member)->get(route('dashboard'))->assertRedirect(route('profile.edit'));
});

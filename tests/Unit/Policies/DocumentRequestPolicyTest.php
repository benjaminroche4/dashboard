<?php

declare(strict_types=1);

use App\Models\User;
use App\Policies\DocumentRequestPolicy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

test('every staff member views, creates and updates, only admins delete', function (): void {
    $policy = new DocumentRequestPolicy;
    $member = User::factory()->create();
    $admin = User::factory()->admin()->create();

    expect($policy->viewAny($member))->toBeTrue()
        ->and($policy->view($member))->toBeTrue()
        ->and($policy->create($member))->toBeTrue()
        ->and($policy->update($member))->toBeTrue()
        ->and($policy->delete($member))->toBeFalse()
        ->and($policy->delete($admin))->toBeTrue();
});

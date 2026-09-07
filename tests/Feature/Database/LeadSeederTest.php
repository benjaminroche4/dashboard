<?php

declare(strict_types=1);

use App\Enums\LeadStatus;
use App\Models\Lead;
use Database\Seeders\LeadSeeder;
use Database\Seeders\StaffSeeder;

it('répartit les leads sur les six derniers mois avec un premier contact rapide', function (): void {
    $this->seed(StaffSeeder::class);
    $this->seed(LeadSeeder::class);

    $contacted = Lead::query()->whereNotNull('last_contacted_at')->get();

    expect(Lead::query()->count())->toBe(58)
        ->and(Lead::query()->where('status', LeadStatus::Converted)->count())->toBe(22)
        ->and(Lead::query()->where('created_at', '<', now()->subMonths(2))->exists())->toBeTrue()
        ->and(Lead::query()->where('created_at', '<', now()->subMonths(6)->subDay())->exists())->toBeFalse()
        ->and($contacted->every(fn (Lead $lead): bool => $lead->created_at->diffInMinutes($lead->last_contacted_at) <= 180))->toBeTrue()
        ->and(Lead::query()->where('status', LeadStatus::Todo)->whereNotNull('last_contacted_at')->exists())->toBeFalse();
});

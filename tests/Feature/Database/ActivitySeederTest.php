<?php

declare(strict_types=1);

use App\Models\Activity;
use Database\Seeders\ActivitySeeder;
use Database\Seeders\LeadSeeder;
use Database\Seeders\StaffSeeder;

it('seeds forty activities over the last month, signed and linked to leads', function (): void {
    $this->seed([StaffSeeder::class, LeadSeeder::class, ActivitySeeder::class]);

    expect(Activity::query()->count())->toBe(ActivitySeeder::COUNT)
        ->and(Activity::query()->whereNull('user_id')->exists())->toBeFalse()
        ->and(Activity::query()->whereNotNull('lead_id')->exists())->toBeTrue()
        ->and(Activity::query()->where('created_at', '<', now()->subDays(31))->exists())->toBeFalse()
        ->and(Activity::query()->where('created_at', '>', now())->exists())->toBeFalse();
});

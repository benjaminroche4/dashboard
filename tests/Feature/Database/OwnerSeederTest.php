<?php

declare(strict_types=1);

use App\Enums\OwnerStatus;
use App\Models\Owner;
use Database\Seeders\OwnerSeeder;
use Database\Seeders\StaffSeeder;

it('crée des propriétaires à divers stades, chacun avec un auteur', function (): void {
    $this->seed(StaffSeeder::class);
    $this->seed(OwnerSeeder::class);

    expect(Owner::query()->count())->toBe(14)
        ->and(Owner::query()->where('status', OwnerStatus::ToContact)->count())->toBe(6)
        ->and(Owner::query()->whereNull('created_by')->exists())->toBeFalse();
});

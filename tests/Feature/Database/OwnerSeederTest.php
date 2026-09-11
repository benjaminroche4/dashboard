<?php

declare(strict_types=1);

use App\Enums\OwnerKind;
use App\Models\Owner;
use Database\Seeders\OwnerSeeder;
use Database\Seeders\StaffSeeder;

it('crée l’annuaire des propriétaires, particuliers et sociétés, chacun avec un auteur', function (): void {
    $this->seed(StaffSeeder::class);
    $this->seed(OwnerSeeder::class);

    expect(Owner::query()->count())->toBe(14)
        ->and(Owner::query()->where('kind', OwnerKind::Company)->count())->toBe(4)
        ->and(Owner::query()->whereNull('created_by')->exists())->toBeFalse()
        // La moitié a un dernier échange : la colonne n'est pas vide en démo.
        ->and(Owner::query()->whereNotNull('last_contacted_at')->count())->toBe(7);
});

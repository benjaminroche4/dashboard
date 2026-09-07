<?php

declare(strict_types=1);

use App\Models\Quote;
use Database\Seeders\QuoteSeeder;
use Database\Seeders\StaffSeeder;

it('assigne un auteur du staff à chaque devis', function (): void {
    $this->seed(StaffSeeder::class);
    $this->seed(QuoteSeeder::class);

    expect(Quote::query()->count())->toBe(24)
        ->and(Quote::query()->whereNull('created_by')->exists())->toBeFalse()
        ->and(Quote::query()->first()?->creator)->not->toBeNull();
});

<?php

declare(strict_types=1);

use App\Models\Invoice;
use Database\Seeders\InvoiceSeeder;
use Database\Seeders\StaffSeeder;

it('assigne un auteur du staff à chaque facture', function (): void {
    $this->seed(StaffSeeder::class);
    $this->seed(InvoiceSeeder::class);

    expect(Invoice::query()->count())->toBe(17)
        ->and(Invoice::query()->whereNull('created_by')->exists())->toBeFalse()
        ->and(Invoice::query()->first()?->creator)->not->toBeNull();
});

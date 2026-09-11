<?php

declare(strict_types=1);

use App\Models\Invoice;
use Database\Seeders\InvoiceSeeder;
use Database\Seeders\StaffSeeder;

it('assigne un auteur du staff à chaque facture', function (): void {
    $this->seed(StaffSeeder::class);
    $this->seed(InvoiceSeeder::class);

    expect(Invoice::query()->count())->toBe(38)
        ->and(Invoice::query()->whereNull('created_by')->exists())->toBeFalse()
        ->and(Invoice::query()->first()?->creator)->not->toBeNull();
});

it('donne à chaque facture un historique qui commence par sa création', function (): void {
    $this->seed([StaffSeeder::class, InvoiceSeeder::class]);

    $invoices = Invoice::query()->with('statusChanges')->get();

    expect($invoices)->not->toBeEmpty();
    foreach ($invoices as $invoice) {
        $first = $invoice->statusChanges->first();

        expect($first)->not->toBeNull()
            ->and($first->from_status)->toBeNull()
            ->and($first->note)->toBe('Création')
            ->and($first->created_at->toDateTimeString())->toBe($invoice->created_at->toDateTimeString());
    }
});

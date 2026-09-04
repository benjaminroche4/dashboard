<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\InvoiceStatus;
use App\Models\Invoice;
use Illuminate\Database\Seeder;

/**
 * Factures d'exemple pour le développement.
 */
final class InvoiceSeeder extends Seeder
{
    public function run(): void
    {
        Invoice::factory()->count(6)->paid()->create();
        Invoice::factory()->count(5)->create();
        Invoice::factory()->count(3)->overdue()->create();
        Invoice::factory()->count(2)->status(InvoiceStatus::Draft)->create();
        Invoice::factory()->status(InvoiceStatus::Cancelled)->create();
    }
}

<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\InvoiceStatus;
use App\Models\Invoice;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Factures d'exemple pour le développement, réparties sur les six derniers mois.
 */
final class InvoiceSeeder extends Seeder
{
    public function run(): void
    {
        // Chaque facture porte un auteur parmi le staff, comme en production.
        $creator = fn (): array => ['created_by' => User::query()->inRandomOrder()->value('id')];

        // Six mois de facturation pour les rapports : 38 factures.
        Invoice::factory()->count(24)->paid()->state($creator)->create();
        Invoice::factory()->count(8)->state($creator)->create();
        Invoice::factory()->count(3)->overdue()->state($creator)->create();
        Invoice::factory()->count(2)->status(InvoiceStatus::Draft)->state($creator)->create();
        Invoice::factory()->status(InvoiceStatus::Cancelled)->state($creator)->create();
    }
}

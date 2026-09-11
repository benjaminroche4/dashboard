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

        // Historique : la création, puis la transition vers le statut atteint.
        // Sans lui, la fiche d'une facture de démonstration n'aurait pas de date de création.
        foreach (Invoice::query()->with('statusChanges')->get() as $invoice) {
            if ($invoice->statusChanges->isNotEmpty()) {
                continue;
            }

            $invoice->statusChanges()->create([
                'from_status' => null,
                'to_status' => InvoiceStatus::Draft,
                'changed_by' => $invoice->created_by,
                'note' => 'Création',
                'created_at' => $invoice->created_at,
            ]);

            if ($invoice->status !== InvoiceStatus::Draft) {
                // La transition ne peut pas précéder la création : les dates des
                // fixtures sont tirées au hasard, on garde la plus tardive.
                $changedAt = $invoice->sent_at ?? $invoice->paid_at ?? $invoice->created_at;

                $invoice->statusChanges()->create([
                    'from_status' => InvoiceStatus::Draft,
                    'to_status' => $invoice->status,
                    'changed_by' => $invoice->created_by,
                    'note' => null,
                    'created_at' => $changedAt->lt($invoice->created_at) ? $invoice->created_at : $changedAt,
                ]);
            }
        }
    }
}

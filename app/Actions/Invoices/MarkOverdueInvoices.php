<?php

declare(strict_types=1);

namespace App\Actions\Invoices;

use App\Enums\InvoiceStatus;
use App\Events\DashboardUpdated;
use App\Models\Invoice;

/**
 * Passe en retard les factures envoyées dont l'échéance est dépassée.
 */
final class MarkOverdueInvoices
{
    /**
     * @return int Nombre de factures passées en retard
     */
    public function handle(): int
    {
        $count = 0;

        Invoice::query()
            ->where('status', InvoiceStatus::Sent)
            ->whereDate('due_at', '<', today())
            ->orderBy('id')
            ->each(function (Invoice $invoice) use (&$count): void {
                $invoice->transitionTo(InvoiceStatus::Overdue, null, 'Échéance dépassée');
                $count++;
            });

        if ($count > 0) {
            event(new DashboardUpdated('invoices', ['count' => $count], "a détecté {$count} facture(s) en retard"));
        }

        return $count;
    }
}

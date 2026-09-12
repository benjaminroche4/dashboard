<?php

declare(strict_types=1);

namespace App\Actions\Invoices;

use App\Events\DashboardUpdated;
use App\Models\Invoice;
use App\Models\Lead;
use App\Models\User;

/**
 * Rattache une facture à un lead (ou la détache avec null). Une facture n'a
 * qu'un lead, un lead peut avoir plusieurs factures.
 */
final class LinkInvoiceToLead
{
    public function handle(Invoice $invoice, ?Lead $lead, ?User $by = null): Invoice
    {
        $previous = $invoice->lead;
        $invoice->lead()->associate($lead);

        // Un document est adressé à un lead ou à un partenaire, pas aux deux.
        if ($lead instanceof Lead) {
            $invoice->partner()->disassociate();
        }

        $invoice->save();

        if ($lead instanceof Lead) {
            $lead->notes()->create(['body' => "Facture {$invoice->number} rattachée à ce lead.", 'user_id' => $by?->id]);
            event(new DashboardUpdated('invoices', ['id' => $invoice->id, 'lead_id' => $lead->id], "a rattaché la facture {$invoice->number} au lead {$lead->fullName()}"));
        } elseif ($previous !== null) {
            $previous->notes()->create(['body' => "Facture {$invoice->number} détachée de ce lead.", 'user_id' => $by?->id]);
            event(new DashboardUpdated('invoices', ['id' => $invoice->id, 'lead_id' => null], "a détaché la facture {$invoice->number} du lead {$previous->fullName()}"));
        }

        return $invoice;
    }
}

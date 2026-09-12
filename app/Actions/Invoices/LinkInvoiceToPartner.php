<?php

declare(strict_types=1);

namespace App\Actions\Invoices;

use App\Events\DashboardUpdated;
use App\Models\Invoice;
use App\Models\Partner;
use App\Models\User;

/**
 * Rattache une facture à un partenaire (ou la détache avec null). Une facture
 * est adressée soit à un lead, soit à un partenaire : rattacher l'un détache
 * l'autre, sinon le document aurait deux destinataires.
 */
final class LinkInvoiceToPartner
{
    public function handle(Invoice $invoice, ?Partner $partner, ?User $by = null): Invoice
    {
        $previous = $invoice->partner;
        $invoice->partner()->associate($partner);

        if ($partner instanceof Partner) {
            $invoice->lead()->disassociate();
        }

        $invoice->save();

        if ($partner instanceof Partner) {
            event(new DashboardUpdated('invoices', ['id' => $invoice->id, 'partner_id' => $partner->id], "a rattaché la facture {$invoice->number} au partenaire {$partner->name}", $by));
        } elseif ($previous instanceof Partner) {
            event(new DashboardUpdated('invoices', ['id' => $invoice->id, 'partner_id' => null], "a détaché la facture {$invoice->number} du partenaire {$previous->name}", $by));
        }

        return $invoice;
    }
}

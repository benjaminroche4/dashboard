<?php

declare(strict_types=1);

namespace App\Actions\Invoices;

use App\Enums\InvoiceStatus;
use App\Events\DashboardUpdated;
use App\Models\Invoice;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Validation\ValidationException;

final class MarkInvoicePaid
{
    /**
     * @throws ValidationException si la facture n'est pas payable
     */
    public function handle(Invoice $invoice, CarbonInterface $paidAt, ?User $by = null): Invoice
    {
        if (! $invoice->status->canTransitionTo(InvoiceStatus::Paid)) {
            throw ValidationException::withMessages(['status' => __('Cette facture ne peut pas être marquée payée depuis le statut « :status ».', ['status' => $invoice->status->label()])]);
        }

        $invoice->paid_at = $paidAt;
        $invoice->transitionTo(InvoiceStatus::Paid, $by, 'Paiement reçu le '.$paidAt->translatedFormat('j F Y'));

        event(new DashboardUpdated('invoices', ['id' => $invoice->id], "a encaissé la facture {$invoice->number}"));

        return $invoice;
    }
}

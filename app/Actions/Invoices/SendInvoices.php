<?php

declare(strict_types=1);

namespace App\Actions\Invoices;

use App\Enums\InvoiceStatus;
use App\Models\Invoice;
use App\Models\User;
use Illuminate\Support\Collection;

/**
 * Envoie plusieurs factures d'un coup : celles qui ne sont pas envoyables
 * (statut ou e-mail manquant) sont ignorées et listées, pas bloquantes.
 */
final readonly class SendInvoices
{
    public function __construct(private SendInvoice $sendInvoice) {}

    /**
     * @param  Collection<int, Invoice>  $invoices
     * @return array{sent: list<string>, skipped: list<string>}
     */
    public function handle(Collection $invoices, ?User $by = null): array
    {
        $sent = [];
        $skipped = [];

        foreach ($invoices as $invoice) {
            $sendable = $invoice->status->canTransitionTo(InvoiceStatus::Sent)
                && $invoice->client_email !== null
                && $invoice->client_email !== '';

            if (! $sendable) {
                $skipped[] = $invoice->number;

                continue;
            }

            $this->sendInvoice->handle($invoice, $by);
            $sent[] = $invoice->number;
        }

        return ['sent' => $sent, 'skipped' => $skipped];
    }
}

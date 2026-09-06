<?php

declare(strict_types=1);

namespace App\Actions\Invoices;

use App\Enums\InvoiceStatus;
use App\Models\Invoice;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

/**
 * Marque plusieurs factures payées à la même date : celles qui ne peuvent
 * pas passer en « payée » sont ignorées et listées.
 */
final readonly class MarkInvoicesPaid
{
    public function __construct(private MarkInvoicePaid $markPaid) {}

    /**
     * @param  Collection<int, Invoice>  $invoices
     * @return array{paid: list<string>, skipped: list<string>}
     */
    public function handle(Collection $invoices, CarbonInterface $paidAt, ?User $by = null): array
    {
        $paid = [];
        $skipped = [];

        foreach ($invoices as $invoice) {
            if (! $invoice->status->canTransitionTo(InvoiceStatus::Paid)) {
                $skipped[] = $invoice->number;

                continue;
            }

            $this->markPaid->handle($invoice, $paidAt, $by);
            $paid[] = $invoice->number;
        }

        return ['paid' => $paid, 'skipped' => $skipped];
    }
}

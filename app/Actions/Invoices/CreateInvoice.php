<?php

declare(strict_types=1);

namespace App\Actions\Invoices;

use App\Data\InvoiceData;
use App\Data\InvoiceLineData;
use App\Events\DashboardUpdated;
use App\Models\Invoice;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Crée une facture : numéro séquentiel par année, totaux calculés,
 * puis diffusion temps réel au staff.
 */
final class CreateInvoice
{
    public function handle(InvoiceData $data, ?User $creator = null): Invoice
    {
        $invoice = DB::transaction(fn (): Invoice => Invoice::create([
            'number' => $this->nextNumber($data->issuedAt->year),
            'client_name' => $data->clientName,
            'client_email' => $data->clientEmail,
            'client_street' => $data->clientStreet,
            'client_postal_code' => $data->clientPostalCode,
            'client_city' => $data->clientCity,
            'client_country' => $data->clientCountry,
            'client_address' => $data->clientAddress(),
            'items' => array_map(fn (InvoiceLineData $line): array => $line->toArray(), $data->lines),
            'vat_rate' => $data->vatRate,
            'subtotal_cents' => $data->subtotalCents(),
            'vat_cents' => $data->vatCents(),
            'amount_cents' => $data->totalCents(),
            'currency' => $data->currency,
            'status' => $data->status,
            'issued_at' => $data->issuedAt,
            'due_at' => $data->dueAt,
            'notes' => $data->notes,
            'created_by' => $creator?->id,
        ]));

        event(new DashboardUpdated('invoices', ['id' => $invoice->id], "a créé la facture {$invoice->number}"));

        return $invoice;
    }

    /**
     * F-AAAA-NNNN, séquentiel par année d'émission.
     */
    private function nextNumber(int $year): string
    {
        $last = Invoice::query()
            ->where('number', 'like', "F-{$year}-%")
            ->orderByDesc('number')
            ->value('number');

        $sequence = $last === null ? 0 : (int) substr((string) $last, -4);

        return sprintf('F-%d-%04d', $year, $sequence + 1);
    }
}

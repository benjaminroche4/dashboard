<?php

declare(strict_types=1);

namespace App\Actions\Invoices;

use App\Data\InvoiceData;
use App\Data\InvoiceLineData;
use App\Enums\InvoiceStatus;
use App\Events\DashboardUpdated;
use App\Models\Invoice;
use App\Models\User;
use Illuminate\Validation\ValidationException;

/**
 * Modifie une facture encore en brouillon : lignes, client, TVA, remise et
 * acompte sont recalculés. Une facture envoyée ne bouge plus — le client en a
 * déjà reçu le PDF ; il faut alors l'annuler et en émettre une autre.
 */
final class UpdateInvoice
{
    /**
     * @throws ValidationException si la facture n'est plus un brouillon
     */
    public function handle(Invoice $invoice, InvoiceData $data, ?User $by = null): Invoice
    {
        if ($invoice->status !== InvoiceStatus::Draft) {
            throw ValidationException::withMessages(['status' => __('Seule une facture en brouillon peut être modifiée.')]);
        }

        $invoice->fill([
            'client_name' => $data->clientName,
            'client_email' => $data->clientEmail,
            'client_street' => $data->clientStreet,
            'client_postal_code' => $data->clientPostalCode,
            'client_city' => $data->clientCity,
            'client_country' => $data->clientCountry,
            'client_address' => $data->clientAddress(),
            'items' => array_map(fn (InvoiceLineData $line): array => $line->toArray(), $data->lines),
            'vat_rate' => $data->vatRate,
            'discount_percent' => $data->discountPercent,
            'discount_cents' => $data->discountCents(),
            'subtotal_cents' => $data->subtotalCents(),
            'vat_cents' => $data->vatCents(),
            'amount_cents' => $data->totalCents(),
            'deposit_cents' => $data->depositCents,
            'currency' => $data->currency,
            'issued_at' => $data->issuedAt,
            'due_at' => $data->dueAt,
            'notes' => $data->notes,
            'bank_name' => $data->bankName,
            'bank_iban' => $data->bankIban,
            'bank_reference' => $data->bankReference,
        ]);

        // Un rattachement absent du formulaire laisse celui du document en place.
        if ($data->leadId !== null) {
            $invoice->lead_id = $data->leadId;
        }

        if ($data->partnerId !== null) {
            $invoice->partner_id = $data->partnerId;
        }

        $invoice->save();

        event(new DashboardUpdated('invoices', ['id' => $invoice->id, 'partner_id' => $invoice->partner_id], "a modifié la facture {$invoice->number}", $by));

        return $invoice;
    }
}

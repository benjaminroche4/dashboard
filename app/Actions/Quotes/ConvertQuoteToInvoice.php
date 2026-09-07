<?php

declare(strict_types=1);

namespace App\Actions\Quotes;

use App\Actions\Invoices\CreateInvoice;
use App\Data\InvoiceData;
use App\Data\InvoiceLineData;
use App\Enums\InvoiceStatus;
use App\Enums\QuoteStatus;
use App\Events\DashboardUpdated;
use App\Models\Invoice;
use App\Models\Quote;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Crée la facture (brouillon) d'un devis accepté ou envoyé : mêmes client,
 * lignes, TVA et remise, émise aujourd'hui avec le délai de paiement par défaut.
 * Le devis passe en « facturé » et garde le lien vers la facture.
 */
final readonly class ConvertQuoteToInvoice
{
    public function __construct(private CreateInvoice $createInvoice) {}

    /**
     * @throws ValidationException si le devis ne peut pas être facturé
     */
    public function handle(Quote $quote, ?User $by = null): Invoice
    {
        if (! $quote->status->canTransitionTo(QuoteStatus::Invoiced)) {
            throw ValidationException::withMessages(['status' => __('Ce devis ne peut pas être facturé depuis le statut « :status ».', ['status' => $quote->status->label()])]);
        }

        $invoice = DB::transaction(function () use ($quote, $by): Invoice {
            $invoice = $this->createInvoice->handle(new InvoiceData(
                clientName: $quote->client_name,
                clientEmail: $quote->client_email,
                clientStreet: $quote->client_street,
                clientPostalCode: $quote->client_postal_code,
                clientCity: $quote->client_city,
                clientCountry: $quote->client_country,
                currency: $quote->currency,
                vatRate: $quote->vat_rate,
                issuedAt: today(),
                dueAt: today()->addDays((int) config('company.default_payment_terms_days')),
                lines: array_map(InvoiceLineData::from(...), $quote->items ?? []),
                notes: $quote->notes,
                status: InvoiceStatus::Draft,
                discountPercent: $quote->discount_percent,
                leadId: $quote->lead_id,
            ), $by);

            $quote->invoice()->associate($invoice);
            $quote->transitionTo(QuoteStatus::Invoiced, $by, "Facture {$invoice->number} créée");

            return $invoice;
        });

        $quote->lead?->notes()->create(['body' => "Facture {$invoice->number} créée depuis le devis {$quote->number}.", 'user_id' => $by?->id]);

        event(new DashboardUpdated('quotes', ['id' => $quote->id, 'invoice_id' => $invoice->id], "a transformé le devis {$quote->number} en facture {$invoice->number}"));

        return $invoice;
    }
}

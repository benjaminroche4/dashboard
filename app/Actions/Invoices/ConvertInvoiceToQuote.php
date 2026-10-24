<?php

declare(strict_types=1);

namespace App\Actions\Invoices;

use App\Actions\Quotes\CreateQuote;
use App\Data\InvoiceLineData;
use App\Data\QuoteData;
use App\Enums\InvoiceStatus;
use App\Events\DashboardUpdated;
use App\Models\Invoice;
use App\Models\Quote;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Crée le devis (brouillon) d'une facture qui n'aurait pas dû l'être : mêmes
 * client, lignes, TVA, remise et compte d'encaissement, émis aujourd'hui avec
 * la validité par défaut, sans acompte. La facture est annulée (un numéro émis
 * ne se supprime pas) et garde le lien vers le devis qui la remplace.
 */
final readonly class ConvertInvoiceToQuote
{
    public function __construct(private CreateQuote $createQuote) {}

    /** Une facture payée ne redevient pas un devis. */
    public static function allowed(Invoice $invoice): bool
    {
        return $invoice->status !== InvoiceStatus::Paid && $invoice->quote_id === null;
    }

    /**
     * @throws ValidationException si la facture ne peut pas devenir un devis
     */
    public function handle(Invoice $invoice, ?User $by = null): Quote
    {
        if (! self::allowed($invoice)) {
            throw ValidationException::withMessages(['status' => __('Cette facture ne peut pas être transformée en devis depuis le statut « :status ».', ['status' => $invoice->status->label()])]);
        }

        $quote = DB::transaction(function () use ($invoice, $by): Quote {
            $quote = $this->createQuote->handle(new QuoteData(
                clientName: $invoice->client_name,
                clientEmail: $invoice->client_email,
                clientStreet: $invoice->client_street,
                clientPostalCode: $invoice->client_postal_code,
                clientCity: $invoice->client_city,
                clientCountry: $invoice->client_country,
                currency: $invoice->currency,
                vatRate: $invoice->vat_rate,
                issuedAt: today(),
                validUntil: today()->addDays((int) config('company.default_quote_validity_days')),
                lines: array_map(InvoiceLineData::from(...), $invoice->items ?? []),
                notes: $invoice->notes,
                discountPercent: $invoice->discount_percent,
                leadId: $invoice->lead_id,
                partnerId: $invoice->partner_id,
                bankName: $invoice->bank_name,
                bankIban: $invoice->bank_iban,
                bankBic: $invoice->bank_bic,
                bankReference: $invoice->bank_reference,
            ), $by);

            $quote->statusChanges()->latest('id')->first()?->update(['note' => "Créé depuis la facture {$invoice->number}"]);

            $invoice->quote()->associate($quote);

            if ($invoice->status->canTransitionTo(InvoiceStatus::Cancelled)) {
                $invoice->transitionTo(InvoiceStatus::Cancelled, $by, "Devis {$quote->number} créé");
            } else {
                $invoice->save();
            }

            return $quote;
        });

        $invoice->lead?->notes()->create(['body' => "Devis {$quote->number} créé depuis la facture {$invoice->number}.", 'user_id' => $by?->id]);

        event(new DashboardUpdated('invoices', ['id' => $invoice->id, 'quote_id' => $quote->id, 'partner_id' => $invoice->partner_id], "a transformé la facture {$invoice->number} en devis {$quote->number}"));

        return $quote;
    }
}

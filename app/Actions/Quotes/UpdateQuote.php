<?php

declare(strict_types=1);

namespace App\Actions\Quotes;

use App\Data\InvoiceLineData;
use App\Data\QuoteData;
use App\Enums\QuoteStatus;
use App\Events\DashboardUpdated;
use App\Models\Quote;
use App\Models\User;
use Illuminate\Validation\ValidationException;

/**
 * Modifie un devis encore en jeu (brouillon ou envoyé) : un devis envoyé se
 * révise et se renvoie tant que le client ne l'a pas accepté. Une fois accepté,
 * refusé, expiré ou facturé, il est figé.
 */
final class UpdateQuote
{
    /** Statuts dans lesquels un devis reste modifiable. */
    public static function isEditable(Quote $quote): bool
    {
        return in_array($quote->status, [QuoteStatus::Draft, QuoteStatus::Sent], true);
    }

    /**
     * @throws ValidationException si le devis est figé
     */
    public function handle(Quote $quote, QuoteData $data, ?User $by = null): Quote
    {
        if (! self::isEditable($quote)) {
            throw ValidationException::withMessages(['status' => __('Un devis :status ne peut plus être modifié.', ['status' => mb_strtolower($quote->status->label())])]);
        }

        $quote->fill([
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
            'currency' => $data->currency,
            'issued_at' => $data->issuedAt,
            'valid_until' => $data->validUntil,
            'notes' => $data->notes,
            'bank_name' => $data->bankName,
            'bank_iban' => $data->bankIban,
            'bank_reference' => $data->bankReference,
        ]);

        // Un rattachement absent du formulaire laisse celui du document en place.
        if ($data->leadId !== null) {
            $quote->lead_id = $data->leadId;
        }

        if ($data->partnerId !== null) {
            $quote->partner_id = $data->partnerId;
        }

        $quote->save();

        event(new DashboardUpdated('quotes', ['id' => $quote->id, 'partner_id' => $quote->partner_id], "a modifié le devis {$quote->number}", $by));

        return $quote;
    }
}

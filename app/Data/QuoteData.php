<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\Currency;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\Date;

/**
 * Données validées pour créer un devis. Mêmes arrondis que InvoiceData
 * (et que resources/js/lib/invoice-totals.ts), sans acompte.
 */
final readonly class QuoteData
{
    /**
     * @param  list<InvoiceLineData>  $lines
     */
    public function __construct(
        public string $clientName,
        public ?string $clientEmail,
        public ?string $clientStreet,
        public ?string $clientPostalCode,
        public ?string $clientCity,
        public ?string $clientCountry,
        public Currency $currency,
        public float $vatRate,
        public CarbonInterface $issuedAt,
        public CarbonInterface $validUntil,
        public array $lines,
        public ?string $notes = null,
        public float $discountPercent = 0,
        public ?int $leadId = null,
        /** Compte d'encaissement figé sur le document ; null = compte par défaut de la devise. */
        public ?string $bankName = null,
        public ?string $bankIban = null,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public static function from(array $data): self
    {
        return new self(
            clientName: $data['client_name'],
            clientEmail: $data['client_email'] ?? null,
            clientStreet: $data['client_street'] ?? null,
            clientPostalCode: $data['client_postal_code'] ?? null,
            clientCity: $data['client_city'] ?? null,
            clientCountry: $data['client_country'] ?? null,
            currency: Currency::from($data['currency']),
            vatRate: (float) $data['vat_rate'],
            issuedAt: Date::parse($data['issued_at']),
            validUntil: Date::parse($data['valid_until']),
            lines: array_map(InvoiceLineData::from(...), array_values($data['items'])),
            notes: $data['notes'] ?? null,
            discountPercent: (float) ($data['discount_percent'] ?? 0),
            leadId: isset($data['lead_id']) ? (int) $data['lead_id'] : null,
            bankName: self::blank($data['bank_name'] ?? null),
            bankIban: self::blank($data['bank_iban'] ?? null),
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'client_name' => $this->clientName,
            'client_email' => $this->clientEmail,
            'client_street' => $this->clientStreet,
            'client_postal_code' => $this->clientPostalCode,
            'client_city' => $this->clientCity,
            'client_country' => $this->clientCountry,
            'client_address' => $this->clientAddress(),
            'items' => array_map(fn (InvoiceLineData $line): array => $line->toArray(), $this->lines),
            'vat_rate' => $this->vatRate,
            'discount_percent' => $this->discountPercent,
            'discount_cents' => $this->discountCents(),
            'subtotal_cents' => $this->subtotalCents(),
            'vat_cents' => $this->vatCents(),
            'amount_cents' => $this->totalCents(),
            'currency' => $this->currency,
            'issued_at' => $this->issuedAt,
            'valid_until' => $this->validUntil,
            'notes' => $this->notes,
            'bank_name' => $this->bankName,
            'bank_iban' => $this->bankIban,
            'lead_id' => $this->leadId,
        ];
    }

    /**
     * Adresse postale sur plusieurs lignes, ou null si rien n'est renseigné.
     */
    public function clientAddress(): ?string
    {
        $lines = array_filter([
            $this->clientStreet,
            trim(($this->clientPostalCode ?? '').' '.($this->clientCity ?? '')),
            $this->clientCountry,
        ], fn (?string $line): bool => $line !== null && $line !== '');

        return $lines === [] ? null : implode("\n", $lines);
    }

    public function subtotalCents(): int
    {
        return array_sum(array_map(fn (InvoiceLineData $line): int => $line->totalCents(), $this->lines));
    }

    /** Remise en centimes, arrondie, appliquée sur le sous-total HT. */
    public function discountCents(): int
    {
        return (int) round($this->subtotalCents() * $this->discountPercent / 100);
    }

    public function netSubtotalCents(): int
    {
        return $this->subtotalCents() - $this->discountCents();
    }

    public function vatCents(): int
    {
        return (int) round($this->netSubtotalCents() * $this->vatRate / 100);
    }

    public function totalCents(): int
    {
        return $this->netSubtotalCents() + $this->vatCents();
    }

    /** Chaîne vide ou blanche : rien de choisi. */
    private static function blank(mixed $value): ?string
    {
        $text = is_string($value) ? trim($value) : '';

        return $text === '' ? null : $text;
    }
}

<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\Currency;
use App\Enums\InvoiceStatus;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\Date;

/**
 * Données validées pour créer une facture. Les totaux sont calculés par l'Action.
 */
final readonly class InvoiceData
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
        public CarbonInterface $dueAt,
        public array $lines,
        public ?string $notes = null,
        public InvoiceStatus $status = InvoiceStatus::Draft,
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
            dueAt: Date::parse($data['due_at']),
            lines: array_map(InvoiceLineData::from(...), array_values($data['items'])),
            notes: $data['notes'] ?? null,
            status: isset($data['status']) ? InvoiceStatus::from($data['status']) : InvoiceStatus::Draft,
        );
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

    public function vatCents(): int
    {
        return (int) round($this->subtotalCents() * $this->vatRate / 100);
    }

    public function totalCents(): int
    {
        return $this->subtotalCents() + $this->vatCents();
    }
}

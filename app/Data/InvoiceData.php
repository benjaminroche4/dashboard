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
        public ?string $clientAddress,
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
            clientAddress: $data['client_address'] ?? null,
            currency: Currency::from($data['currency']),
            vatRate: (float) $data['vat_rate'],
            issuedAt: Date::parse($data['issued_at']),
            dueAt: Date::parse($data['due_at']),
            lines: array_map(InvoiceLineData::from(...), array_values($data['items'])),
            notes: $data['notes'] ?? null,
            status: isset($data['status']) ? InvoiceStatus::from($data['status']) : InvoiceStatus::Draft,
        );
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

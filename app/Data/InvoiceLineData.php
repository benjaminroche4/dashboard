<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\Offer;

/**
 * Ligne de facture : une offre du catalogue, ou une ligne libre décrite
 * par un libellé saisi (service hors offres).
 */
final readonly class InvoiceLineData
{
    public function __construct(
        public ?Offer $offer,
        public float $quantity,
        public int $unitPriceCents,
        public ?string $label = null,
    ) {}

    public function isFree(): bool
    {
        return ! $this->offer instanceof Offer;
    }

    public function description(): string
    {
        return $this->offer?->description() ?? trim((string) $this->label);
    }

    public function totalCents(): int
    {
        return (int) round($this->quantity * $this->unitPriceCents);
    }

    /**
     * @param  array{offer?: string|null, description?: string|null, quantity: float|int|string, unit_price_cents: int|string}  $data
     */
    public static function from(array $data): self
    {
        $offer = isset($data['offer']) && $data['offer'] !== '' ? Offer::from($data['offer']) : null;

        return new self(
            offer: $offer,
            quantity: (float) $data['quantity'],
            unitPriceCents: (int) $data['unit_price_cents'],
            label: $offer === null ? ($data['description'] ?? null) : null,
        );
    }

    /**
     * @return array{offer: string|null, description: string, quantity: float, unit_price_cents: int}
     */
    public function toArray(): array
    {
        return [
            'offer' => $this->offer?->value,
            'description' => $this->description(),
            'quantity' => $this->quantity,
            'unit_price_cents' => $this->unitPriceCents,
        ];
    }
}

<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\Offer;

final readonly class InvoiceLineData
{
    public function __construct(
        public Offer $offer,
        public float $quantity,
        public int $unitPriceCents,
    ) {}

    public function description(): string
    {
        return $this->offer->description();
    }

    public function totalCents(): int
    {
        return (int) round($this->quantity * $this->unitPriceCents);
    }

    /**
     * @param  array{offer: string, quantity: float|int|string, unit_price_cents: int|string}  $data
     */
    public static function from(array $data): self
    {
        return new self(
            offer: Offer::from($data['offer']),
            quantity: (float) $data['quantity'],
            unitPriceCents: (int) $data['unit_price_cents'],
        );
    }

    /**
     * @return array{offer: string, description: string, quantity: float, unit_price_cents: int}
     */
    public function toArray(): array
    {
        return [
            'offer' => $this->offer->value,
            'description' => $this->description(),
            'quantity' => $this->quantity,
            'unit_price_cents' => $this->unitPriceCents,
        ];
    }
}

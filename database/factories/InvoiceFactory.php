<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\Currency;
use App\Enums\InvoiceStatus;
use App\Enums\Offer;
use App\Models\Invoice;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Invoice>
 */
class InvoiceFactory extends Factory
{
    private static int $sequence = 1;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $issuedAt = fake()->dateTimeBetween('-6 months', 'now');
        $currency = fake()->randomElement(Currency::cases());
        $items = collect(range(1, fake()->numberBetween(1, 2)))
            ->map(function () use ($currency): array {
                $offer = fake()->randomElement(Offer::cases());

                return [
                    'offer' => $offer->value,
                    'description' => $offer->description(),
                    'quantity' => fake()->randomElement([1, 1, 1, 2, 3]),
                    'unit_price_cents' => $offer->defaultPriceCents($currency),
                ];
            })
            ->all();
        $subtotal = array_sum(array_map(fn (array $item): int => (int) ($item['quantity'] * $item['unit_price_cents']), $items));
        $vatRate = fake()->randomElement([8.1, 0]);
        $vat = (int) round($subtotal * $vatRate / 100);

        return [
            // Compteur statique : les closures étant résolues avant l'insertion, nextNumber() donnerait des doublons en série.
            'number' => sprintf('RP-27%03d', self::$sequence++),
            'client_name' => fake()->company(),
            'client_email' => fake()->companyEmail(),
            'client_street' => fake()->streetAddress(),
            'client_postal_code' => fake()->postcode(),
            'client_city' => fake()->city(),
            'client_country' => fake()->randomElement(['Suisse', 'France']),
            'client_address' => null,
            'items' => $items,
            'vat_rate' => $vatRate,
            'discount_percent' => 0,
            'discount_cents' => 0,
            'deposit_cents' => 0,
            'subtotal_cents' => $subtotal,
            'vat_cents' => $vat,
            'amount_cents' => $subtotal + $vat,
            'currency' => $currency,
            'status' => InvoiceStatus::Sent,
            'issued_at' => $issuedAt,
            'due_at' => (clone $issuedAt)->modify('+30 days'),
            'paid_at' => null,
        ];
    }

    public function status(InvoiceStatus $status): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => $status,
            'paid_at' => $status === InvoiceStatus::Paid ? fake()->dateTimeBetween($attributes['issued_at'], 'now') : null,
        ]);
    }

    public function paid(): static
    {
        return $this->status(InvoiceStatus::Paid);
    }

    public function overdue(): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => InvoiceStatus::Overdue,
            'issued_at' => now()->subDays(60),
            'due_at' => now()->subDays(30),
        ]);
    }
}

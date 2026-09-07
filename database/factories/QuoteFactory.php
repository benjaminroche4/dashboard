<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\Currency;
use App\Enums\Offer;
use App\Enums\QuoteStatus;
use App\Models\Quote;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Quote>
 */
class QuoteFactory extends Factory
{
    private static int $sequence = 1;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $issuedAt = fake()->dateTimeBetween('-6 months', 'now');
        $currency = fake()->randomElement(Currency::cases());
        $offer = fake()->randomElement(Offer::cases());
        $items = [[
            'offer' => $offer->value,
            'description' => $offer->description(),
            'quantity' => 1,
            'unit_price_cents' => $offer->defaultPriceCents($currency),
        ]];
        $subtotal = array_sum(array_map(fn (array $item): int => (int) ($item['quantity'] * $item['unit_price_cents']), $items));
        $vatRate = fake()->randomElement([8.1, 0]);
        $vat = (int) round($subtotal * $vatRate / 100);

        return [
            // Compteur statique : nextNumber() donnerait des doublons en série (closures résolues avant l'insertion).
            'number' => sprintf('DV-27%03d', self::$sequence++),
            'client_name' => fake()->name(),
            'client_email' => fake()->safeEmail(),
            'client_street' => fake()->streetAddress(),
            'client_postal_code' => fake()->postcode(),
            'client_city' => fake()->city(),
            'client_country' => fake()->randomElement(['Suisse', 'France']),
            'client_address' => null,
            'items' => $items,
            'vat_rate' => $vatRate,
            'discount_percent' => 0,
            'discount_cents' => 0,
            'subtotal_cents' => $subtotal,
            'vat_cents' => $vat,
            'amount_cents' => $subtotal + $vat,
            'currency' => $currency,
            'status' => QuoteStatus::Sent,
            'issued_at' => $issuedAt,
            'valid_until' => (clone $issuedAt)->modify('+30 days'),
            'sent_at' => $issuedAt,
        ];
    }

    public function status(QuoteStatus $status): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => $status,
            'sent_at' => $status === QuoteStatus::Draft ? null : $attributes['sent_at'],
            'accepted_at' => in_array($status, [QuoteStatus::Accepted, QuoteStatus::Invoiced], true) ? fake()->dateTimeBetween($attributes['issued_at'], 'now') : null,
            'declined_at' => $status === QuoteStatus::Declined ? fake()->dateTimeBetween($attributes['issued_at'], 'now') : null,
        ]);
    }

    public function accepted(): static
    {
        return $this->status(QuoteStatus::Accepted);
    }

    public function expired(): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => QuoteStatus::Expired,
            'issued_at' => now()->subDays(60),
            'valid_until' => now()->subDays(30),
        ]);
    }
}

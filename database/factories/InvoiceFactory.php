<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\InvoiceStatus;
use App\Models\Invoice;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Invoice>
 */
class InvoiceFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $issuedAt = fake()->dateTimeBetween('-90 days', 'now');

        return [
            'number' => sprintf('F-%s-%04d', $issuedAt->format('Y'), fake()->unique()->numberBetween(1, 9999)),
            'client_name' => fake()->company(),
            'client_email' => fake()->companyEmail(),
            'amount_cents' => fake()->numberBetween(15_000, 1_250_000),
            'currency' => 'EUR',
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

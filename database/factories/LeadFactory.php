<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\Currency;
use App\Enums\LeadSource;
use App\Enums\LeadStatus;
use App\Enums\Offer;
use App\Models\Lead;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Lead>
 */
class LeadFactory extends Factory
{
    protected $model = Lead::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'first_name' => fake()->firstName(),
            'last_name' => fake()->lastName(),
            'email' => fake()->safeEmail(),
            'phone' => fake()->e164PhoneNumber(),
            'offer' => fake()->randomElement(Offer::cases()),
            'arrival_at' => fake()->dateTimeBetween('+1 week', '+6 months')->format('Y-m-d'),
            'budget_cents' => fake()->numberBetween(15, 60) * 10_000,
            'currency' => Currency::EUR,
            'origin_city' => fake()->city(),
            'source' => fake()->randomElement(LeadSource::cases()),
            'message' => fake()->optional()->sentence(12),
            'status' => LeadStatus::New,
            'last_contacted_at' => null,
        ];
    }

    public function status(LeadStatus $status): static
    {
        return $this->state(fn (): array => [
            'status' => $status,
            'last_contacted_at' => $status === LeadStatus::New ? null : now()->subDays(fake()->numberBetween(0, 10)),
        ]);
    }

    public function converted(): static
    {
        return $this->status(LeadStatus::Converted);
    }
}

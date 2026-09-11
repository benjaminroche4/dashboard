<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Lead;
use App\Models\LeadGuarantor;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<LeadGuarantor>
 */
class LeadGuarantorFactory extends Factory
{
    protected $model = LeadGuarantor::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'lead_id' => Lead::factory(),
            'first_name' => fake()->firstName(),
            'last_name' => fake()->lastName(),
            'email' => fake()->safeEmail(),
            'phone' => '+33 6 12 34 56 78',
            'income_cents' => fake()->numberBetween(200_000, 800_000),
            'note' => null,
        ];
    }
}

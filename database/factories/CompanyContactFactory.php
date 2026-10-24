<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\ContactFunction;
use App\Models\CompanyContact;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CompanyContact>
 */
class CompanyContactFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'first_name' => fake()->firstName(),
            'last_name' => fake()->lastName(),
            'position' => fake()->randomElement([ContactFunction::Manager, ContactFunction::Director, ContactFunction::Assistant, null]),
            'is_primary' => false,
            'email' => fake()->unique()->safeEmail(),
            'phone' => '+33 6 '.fake()->numerify('## ## ## ##'),
        ];
    }

    public function primary(): static
    {
        return $this->state(fn (): array => ['is_primary' => true]);
    }
}

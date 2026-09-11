<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\ContactFunction;
use App\Models\PartnerContact;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PartnerContact>
 */
class PartnerContactFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'first_name' => fake()->firstName(),
            'last_name' => fake()->lastName(),
            'position' => fake()->randomElement([ContactFunction::Sales, ContactFunction::Manager, ContactFunction::AccountManager, null]),
            'email' => fake()->unique()->safeEmail(),
            'phone' => '+33 6 '.fake()->numerify('## ## ## ##'),
        ];
    }
}

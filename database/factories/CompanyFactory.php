<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Company;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Company>
 */
class CompanyFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->company(),
            'email' => 'rh@'.fake()->unique()->domainName(),
            'phone' => '+33 1 '.fake()->numerify('## ## ## ##'),
            'website' => fake()->boolean(70) ? 'https://'.fake()->domainName() : null,
            'street' => fake()->boolean(70) ? fake()->streetAddress() : null,
            'postal_code' => '750'.str_pad((string) fake()->numberBetween(1, 20), 2, '0', STR_PAD_LEFT),
            'city' => 'Paris',
            'notes' => fake()->boolean(40) ? fake()->sentence(10) : null,
            'created_by' => null,
        ];
    }
}

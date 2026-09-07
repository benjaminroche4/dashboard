<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Agency;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Agency>
 */
class AgencyFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->unique()->company();

        return [
            'name' => $name,
            'street' => fake()->streetAddress(),
            'postal_code' => '750'.str_pad((string) fake()->numberBetween(1, 20), 2, '0', STR_PAD_LEFT),
            'city' => 'Paris',
            'phone' => '+33 1 '.fake()->numerify('## ## ## ##'),
            'email' => 'contact@'.fake()->unique()->domainName(),
            'website' => fake()->boolean(70) ? 'https://'.fake()->domainName() : null,
            'notes' => fake()->boolean(40) ? fake()->sentence(10) : null,
            'created_by' => null,
        ];
    }
}

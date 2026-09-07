<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\OwnerStatus;
use App\Models\Owner;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Owner>
 */
class OwnerFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'first_name' => fake()->firstName(),
            'last_name' => fake()->lastName(),
            'company' => fake()->boolean(25) ? fake()->company() : null,
            'email' => fake()->unique()->safeEmail(),
            'phone' => '+33 6 '.fake()->numerify('## ## ## ##'),
            'street' => fake()->streetAddress(),
            'postal_code' => '750'.str_pad((string) fake()->numberBetween(1, 20), 2, '0', STR_PAD_LEFT),
            'city' => 'Paris',
            'property_count' => fake()->randomElement([1, 1, 1, 2, 3, 5]),
            'status' => OwnerStatus::ToContact,
            'last_contacted_at' => null,
            'notes' => fake()->boolean(40) ? fake()->sentence(10) : null,
            'created_by' => null,
        ];
    }

    public function status(OwnerStatus $status): static
    {
        return $this->state(fn (): array => [
            'status' => $status,
            'last_contacted_at' => $status === OwnerStatus::ToContact ? null : fake()->dateTimeBetween('-2 months', 'now'),
        ]);
    }
}

<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\OwnerKind;
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
            'kind' => OwnerKind::Individual,
            'company' => null,
            'email' => fake()->unique()->safeEmail(),
            'phone' => '+33 6 '.fake()->numerify('## ## ## ##'),
            'street' => fake()->streetAddress(),
            'postal_code' => '750'.str_pad((string) fake()->numberBetween(1, 20), 2, '0', STR_PAD_LEFT),
            'city' => 'Paris',
            'notes' => fake()->boolean(40) ? fake()->sentence(10) : null,
            'created_by' => null,
        ];
    }

    /** Propriétaire société : la raison sociale nomme la fiche. */
    public function company(): static
    {
        return $this->state(fn (): array => [
            'kind' => OwnerKind::Company,
            'company' => fake()->company(),
        ]);
    }
}

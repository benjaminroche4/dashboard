<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\PartnerType;
use App\Models\Partner;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Partner>
 */
class PartnerFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->company(),
            'type' => fake()->randomElement(PartnerType::cases()),
            'email' => 'contact@'.fake()->unique()->domainName(),
            'phone' => '+33 1 '.fake()->numerify('## ## ## ##'),
            'website' => fake()->boolean(60) ? 'https://'.fake()->domainName() : null,
            'street' => fake()->boolean(60) ? fake()->streetAddress() : null,
            'postal_code' => '750'.str_pad((string) fake()->numberBetween(1, 20), 2, '0', STR_PAD_LEFT),
            'city' => 'Paris',
            'notes' => fake()->boolean(40) ? fake()->sentence(10) : null,
            'created_by' => null,
        ];
    }

    public function type(PartnerType $type): static
    {
        return $this->state(fn (): array => ['type' => $type]);
    }
}

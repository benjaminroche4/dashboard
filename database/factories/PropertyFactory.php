<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\Currency;
use App\Enums\Furnished;
use App\Enums\PropertyType;
use App\Models\Property;
use App\Support\ParisArrondissements;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Property>
 */
class PropertyFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $district = fake()->numberBetween(1, 20);
        $type = fake()->randomElement([PropertyType::Studio, PropertyType::T2, PropertyType::T2, PropertyType::T3, PropertyType::T4]);

        return [
            'title' => fake()->boolean(60) ? "{$type->label()} lumineux · {$district}e" : null,
            'street' => fake()->streetAddress(),
            'postal_code' => '750'.str_pad((string) $district, 2, '0', STR_PAD_LEFT),
            'city' => 'Paris',
            'district' => $district,
            'property_type' => $type,
            'furnished' => fake()->randomElement([Furnished::Furnished, Furnished::Furnished, Furnished::Unfurnished]),
            'rooms' => fake()->numberBetween(1, 5),
            'surface_m2' => fake()->numberBetween(18, 120),
            'rent_cents' => fake()->numberBetween(9, 45) * 10_000,
            'currency' => Currency::EUR,
            'listing_url' => fake()->boolean(50) ? 'https://www.seloger.com/annonces/'.fake()->numerify('#########').'.htm' : null,
            'agent_id' => null,
            'owner_id' => null,
            'notes' => fake()->boolean(30) ? fake()->sentence(8) : null,
            'created_by' => null,
        ];
    }

    /**
     * Bien positionné sur la carte : les adresses sont inventées, on le place
     * près du centre de son arrondissement (fixtures de développement).
     */
    public function located(): static
    {
        return $this->state(function (array $attributes): array {
            $center = ParisArrondissements::centroid((int) ($attributes['district'] ?? 0)) ?? ['lat' => 48.8589, 'lng' => 2.3469];

            return [
                'latitude' => round($center['lat'] + fake()->randomFloat(4, -0.006, 0.006), 7),
                'longitude' => round($center['lng'] + fake()->randomFloat(4, -0.009, 0.009), 7),
            ];
        });
    }
}

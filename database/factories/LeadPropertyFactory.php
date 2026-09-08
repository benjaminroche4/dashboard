<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\Furnished;
use App\Enums\LeaseType;
use App\Enums\Orientation;
use App\Enums\OwnerPropertyType;
use App\Enums\PropertyAmenity;
use App\Enums\PropertyStatus;
use App\Models\LeadProperty;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<LeadProperty>
 */
class LeadPropertyFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $type = fake()->randomElement(OwnerPropertyType::cases());
        $surface = match ($type) {
            OwnerPropertyType::Studio => fake()->numberBetween(15, 30),
            OwnerPropertyType::T1 => fake()->numberBetween(25, 40),
            OwnerPropertyType::T2 => fake()->numberBetween(35, 60),
            OwnerPropertyType::T3 => fake()->numberBetween(55, 85),
            OwnerPropertyType::T4 => fake()->numberBetween(75, 110),
            default => fake()->numberBetween(90, 180),
        };

        return [
            'address' => fake()->buildingNumber().' '.fake()->streetName().', 750'.str_pad((string) fake()->numberBetween(1, 20), 2, '0', STR_PAD_LEFT).' Paris',
            'place_id' => null,
            'property_type' => $type,
            'property_status' => fake()->randomElement(PropertyStatus::cases()),
            'bedrooms' => fake()->numberBetween(0, 4),
            'bathrooms' => fake()->numberBetween(1, 2),
            'surface' => $surface,
            'floor' => fake()->numberBetween(0, 6),
            'building_floors' => fake()->numberBetween(4, 8),
            'furnishing' => fake()->randomElement([Furnished::Furnished, Furnished::Unfurnished]),
            'orientations' => fake()->randomElements(Orientation::cases(), fake()->numberBetween(1, 2)),
            'lease_types' => fake()->randomElements(LeaseType::cases(), fake()->numberBetween(1, 2)),
            'rent_cents' => $surface * fake()->numberBetween(3_000, 4_500),
            'charges_cents' => fake()->numberBetween(5, 25) * 1_000,
            'deposit_cents' => $surface * fake()->numberBetween(3_000, 4_500),
            'amenities' => fake()->randomElements(PropertyAmenity::cases(), fake()->numberBetween(2, 7)),
            'note' => fake()->optional(0.5)->sentence(12),
        ];
    }
}

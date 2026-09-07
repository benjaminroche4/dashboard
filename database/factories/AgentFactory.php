<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\AgentPosition;
use App\Models\Agency;
use App\Models\Agent;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Agent>
 */
class AgentFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'agency_id' => null,
            'first_name' => fake()->firstName(),
            'last_name' => fake()->lastName(),
            'position' => fake()->randomElement([AgentPosition::Negotiator, AgentPosition::Advisor, AgentPosition::AgencyDirector, AgentPosition::RentalManager, null]),
            'street' => null,
            'postal_code' => null,
            'city' => null,
            'email' => fake()->unique()->safeEmail(),
            'phone' => '+33 6 '.fake()->numerify('## ## ## ##'),
            'notes' => fake()->boolean(40) ? fake()->sentence(8) : null,
            'created_by' => null,
        ];
    }

    public function forAgency(Agency $agency): static
    {
        return $this->state(fn (): array => ['agency_id' => $agency->id]);
    }
}

<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\VisitStatus;
use App\Models\Lead;
use App\Models\Property;
use App\Models\Visit;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Visit>
 */
class VisitFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'lead_id' => Lead::factory()->converted(),
            'property_id' => Property::factory(),
            'agent_id' => null,
            'scheduled_at' => fake()->dateTimeBetween('+1 day', '+3 weeks'),
            'status' => VisitStatus::Planned,
            'notes' => fake()->boolean(30) ? fake()->sentence(6) : null,
            'created_by' => null,
        ];
    }

    public function status(VisitStatus $status): static
    {
        return $this->state(fn (): array => [
            'status' => $status,
            'scheduled_at' => $status === VisitStatus::Planned
                ? fake()->dateTimeBetween('+1 day', '+3 weeks')
                : fake()->dateTimeBetween('-2 months', '-1 day'),
        ]);
    }

    /** Visite passée avec son compte rendu. */
    public function reported(): static
    {
        return $this->state(fn (): array => [
            'status' => VisitStatus::Done,
            'scheduled_at' => fake()->dateTimeBetween('-2 months', '-1 day'),
            'report' => fake()->paragraph(),
            'report_submitted_at' => now(),
            'report_reminded_at' => now(),
        ]);
    }
}

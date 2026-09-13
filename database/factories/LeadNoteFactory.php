<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\LeadNoteKind;
use App\Models\Lead;
use App\Models\LeadNote;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<LeadNote>
 */
class LeadNoteFactory extends Factory
{
    protected $model = LeadNote::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'lead_id' => Lead::factory(),
            'user_id' => User::factory(),
            'body' => fake()->sentence(10),
            // Une note de fixture est écrite par un membre : le suivi, lui,
            // naît des Actions.
            'kind' => LeadNoteKind::Team,
        ];
    }

    /** Note de suivi, telle que l'application l'écrit au fil des actions. */
    public function tracking(): self
    {
        return $this->state(fn (): array => ['kind' => LeadNoteKind::Tracking]);
    }
}

<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\LeadStatus;
use App\Enums\PropertyStatus;
use App\Enums\VisitStatus;
use App\Models\Agent;
use App\Models\Lead;
use App\Models\Property;
use App\Models\User;
use App\Models\Visit;
use Illuminate\Database\Seeder;

/**
 * Biens et visites de développement : 12 biens (dont 6 suivis par un agent),
 * 9 visites pour les clients existants, chacune confiée à un membre de l'équipe :
 * 5 planifiées, 3 effectuées (2 avec compte rendu, 1 dont le compte rendu est
 * attendu et sera rappelé par `visits:remind-reports`), 1 annulée.
 */
final class PropertySeeder extends Seeder
{
    public function run(): void
    {
        $creator = fn (): array => ['created_by' => User::query()->inRandomOrder()->value('id')];
        $agent = fn (): array => ['agent_id' => Agent::query()->inRandomOrder()->value('id')];

        Property::factory()->count(4)->located()->state($creator)->create();
        Property::factory()->located()->status(PropertyStatus::UnderOffer)->state($creator)->create();
        Property::factory()->located()->status(PropertyStatus::Unavailable)->state($creator)->create();
        Property::factory()->count(5)->located()->state($creator)->state($agent)->create();
        Property::factory()->located()->status(PropertyStatus::Rented)->state($creator)->state($agent)->create();

        $clients = Lead::query()->where('status', LeadStatus::Converted)->inRandomOrder()->limit(5)->get();

        if ($clients->isEmpty()) {
            return;
        }

        $assignee = fn (): array => ['assigned_to' => User::query()->inRandomOrder()->value('id')];
        $target = fn (): array => [
            'lead_id' => $clients->random()->id,
            'property_id' => Property::query()->inRandomOrder()->value('id'),
        ];

        foreach (range(1, 5) as $ignored) {
            Visit::factory()->status(VisitStatus::Planned)->state($creator)->state($assignee)->create($target());
        }

        // Deux visites effectuées avec leur compte rendu, rédigé par le responsable.
        foreach (range(1, 2) as $ignored) {
            $visit = Visit::factory()->reported()->state($creator)->state($assignee)->create($target());
            $visit->update(['report_submitted_by' => $visit->assigned_to]);
        }

        // Une visite effectuée hier dont le compte rendu manque encore.
        Visit::factory()->status(VisitStatus::Done)->state($creator)->state($assignee)->create([...$target(), 'scheduled_at' => now()->subDay()->setTime(11, 0)]);

        Visit::factory()->status(VisitStatus::Cancelled)->state($creator)->state($assignee)->create($target());
    }
}

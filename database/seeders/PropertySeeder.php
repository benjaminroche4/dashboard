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
 * et des visites pour les clients existants, chacune confiée à un membre de
 * l'équipe. Les visites planifiées sont **groupées par journée** (trois jours
 * de tournée de 3 à 4 visites, plus quelques visites isolées) : c'est ce qui
 * fait vivre la carte du jour et l'itinéraire de la tournée. S'y ajoutent
 * 3 visites effectuées (2 avec compte rendu, 1 dont le compte rendu est
 * attendu et sera rappelé par `visits:remind-reports`) et 1 annulée.
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

        // Deux photos par bien : les vignettes des listes et la couverture des
        // cartes n'ont d'intérêt que si le jeu de démonstration en a.
        Property::query()->each(fn (Property $property): array => PropertyPhotos::attach($property));

        $clients = Lead::query()->where('status', LeadStatus::Converted)->inRandomOrder()->limit(5)->get();

        if ($clients->isEmpty()) {
            return;
        }

        $assignee = fn (): array => ['assigned_to' => User::query()->inRandomOrder()->value('id')];
        $target = fn (): array => [
            'lead_id' => $clients->random()->id,
            'property_id' => Property::query()->inRandomOrder()->value('id'),
        ];

        // Trois journées de tournée : plusieurs visites le même jour, à des
        // heures ouvrables espacées, pour la carte du jour et son itinéraire.
        $days = [now()->addDay(), now()->addDays(3), now()->addDays(8)];

        foreach ($days as $index => $day) {
            $hours = [9, 11, 14, 16];

            foreach (array_slice($hours, 0, $index === 1 ? 4 : 3) as $hour) {
                Visit::factory()->status(VisitStatus::Planned)->state($creator)->state($assignee)->create([
                    ...$target(),
                    'scheduled_at' => $day->copy()->setTime($hour, 0),
                ]);
            }
        }

        // Quelques visites isolées, ailleurs dans les trois semaines à venir.
        foreach (range(1, 3) as $ignored) {
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

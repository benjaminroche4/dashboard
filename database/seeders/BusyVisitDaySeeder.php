<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\LeadStatus;
use App\Enums\VisitMode;
use App\Enums\VisitStatus;
use App\Models\Agent;
use App\Models\Lead;
use App\Models\Property;
use App\Models\User;
use App\Models\Visit;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;

/**
 * Une journée de visites chargée, pour voir tenir la liste par jour, la carte
 * de la tournée et son itinéraire : 50 visites sur le prochain lundi, de 8 h à
 * 20 h, réparties entre les membres et dans tout Paris.
 *
 * Ne tourne jamais tout seul : `php artisan db:seed --class=BusyVisitDaySeeder`.
 */
final class BusyVisitDaySeeder extends Seeder
{
    public const int VISITS = 50;

    /** Première et dernière heure de la journée. */
    private const int FIRST_HOUR = 8;

    private const int LAST_HOUR = 20;

    public function run(): void
    {
        $day = $this->nextMonday();
        $clients = $this->clients();
        $members = User::query()->get();
        $agents = Agent::query()->inRandomOrder()->limit(12)->get();
        $properties = $this->properties();

        $slots = $this->slots();

        foreach (range(0, self::VISITS - 1) as $index) {
            $client = $clients[$index % $clients->count()];
            $property = $properties[$index % $properties->count()];

            Visit::factory()->create([
                'lead_id' => $client->id,
                'property_id' => $property->id,
                'agent_id' => $agents->isEmpty() ? null : $agents[$index % $agents->count()]->id,
                'assigned_to' => $members->isEmpty() ? null : $members[$index % $members->count()]->id,
                'created_by' => $members->isEmpty() ? null : $members[0]->id,
                'scheduled_at' => $day->setTimeFromTimeString($slots[$index % count($slots)]),
                'status' => VisitStatus::Planned,
                // Le mode découle de la formule du client, il ne se choisit pas.
                'mode' => VisitMode::forOffer($client->offer),
                'notes' => $index % 3 === 0 ? 'Code de la porte communiqué la veille.' : null,
            ]);
        }
    }

    /** Le prochain lundi (aujourd'hui s'il l'est déjà). */
    private function nextMonday(): CarbonImmutable
    {
        $today = CarbonImmutable::today();

        return $today->isMonday() ? $today : $today->next('monday');
    }

    /**
     * Les créneaux de la journée, par quart d'heure, répartis sur l'amplitude.
     *
     * @return list<string>
     */
    private function slots(): array
    {
        $slots = [];

        for ($hour = self::FIRST_HOUR; $hour < self::LAST_HOUR; $hour++) {
            foreach (['00', '15', '30', '45'] as $minute) {
                $slots[] = sprintf('%02d:%s', $hour, $minute);
            }
        }

        return $slots;
    }

    /**
     * Les dossiers clients existants ; à défaut, on en crée de quoi remplir
     * la journée sans donner deux visites de suite au même client.
     *
     * @return Collection<int, Lead>
     */
    private function clients(): Collection
    {
        $clients = Lead::query()->where('status', LeadStatus::Converted)->inRandomOrder()->get();

        if ($clients->count() >= 12) {
            return $clients;
        }

        return $clients->concat(Lead::factory()->converted()->count(12 - $clients->count())->create());
    }

    /**
     * Un bien par visite, tous géocodés : sans position, la carte de la tournée
     * n'a rien à montrer.
     *
     * @return Collection<int, Property>
     */
    private function properties(): Collection
    {
        $located = Property::query()->whereNotNull('latitude')->get();
        $missing = self::VISITS - $located->count();

        if ($missing <= 0) {
            return $located;
        }

        return $located->concat(Property::factory()->located()->count($missing)->create());
    }
}

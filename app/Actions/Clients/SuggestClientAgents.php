<?php

declare(strict_types=1);

namespace App\Actions\Clients;

use App\Enums\AgencySpecialty;
use App\Enums\Furnished;
use App\Enums\GuarantorType;
use App\Enums\LeadLanguage;
use App\Enums\PropertyApplicationStatus;
use App\Enums\RelationshipQuality;
use App\Enums\SpokenLanguage;
use App\Enums\VisitStatus;
use App\Models\Agency;
use App\Models\Agent;
use App\Models\Lead;
use App\Models\LeadPropertyLink;
use App\Models\Property;
use App\Models\User;
use App\Models\Visit;
use App\Support\ParisArrondissements;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Collection;

/**
 * Les agences (et leurs agents) à contacter pour un dossier : chaque agent est
 * noté sur cinq axes — territoire, segment, résultats, disponibilité, relation —
 * et l'agence prend la note de son meilleur agent. Une agence sans agent est
 * notée seule, un indépendant fait sa propre ligne. Les raisons sont en clair.
 */
final class SuggestClientAgents
{
    public const int LIMIT = 5;

    /** Un contact de moins de ce nombre de jours compte comme récent. */
    private const int RECENT_CONTACT_DAYS = 45;

    /**
     * @return list<array{agency: Agency|null, agents: list<array{agent: Agent, score: int, reasons: list<string>, available: int}>, score: int, reasons: list<string>, available_properties: int}>
     */
    public function handle(Lead $lead, int $limit = self::LIMIT): array
    {
        $lead->loadMissing('assignee');
        $advisor = $lead->assignee;

        $agents = Agent::query()->with('agency')
            ->when($advisor instanceof User, fn ($query) => $query->withFavoriteOf($advisor))
            ->get();
        $agencies = Agency::query()
            ->when($advisor instanceof User, fn ($query) => $query->withFavoriteOf($advisor))
            ->get()->keyBy('id');

        $properties = Property::query()->whereNotNull('agent_id')->get()->groupBy('agent_id');
        /** @var Collection<int, Collection<int, LeadPropertyLink>> $outcomes */
        $outcomes = LeadPropertyLink::query()
            ->whereIn('property_id', Property::query()->whereNotNull('agent_id')->select('id'))
            ->get()
            ->toBase()
            ->groupBy('property_id')
            ->map(fn (Collection $links): Collection => $links->toBase());
        $visitsDone = Visit::query()
            ->where('status', VisitStatus::Done)
            ->whereNotNull('agent_id')
            ->selectRaw('agent_id, count(*) as total')
            ->groupBy('agent_id')
            ->pluck('total', 'agent_id');

        $rows = [];
        $seenAgencies = [];

        foreach ($agents->groupBy(fn (Agent $agent): int => $agent->agency_id ?? 0) as $agencyId => $members) {
            $agency = $agencyId === 0 ? null : $agencies->get($agencyId);

            /** @var Collection<int, Agent> $members */
            $scored = $members
                ->map(fn (Agent $agent): array => [
                    'agent' => $agent,
                    ...self::score($lead, $agent, $agent->agency, $properties->get($agent->id) ?? new EloquentCollection, $outcomes, (int) ($visitsDone[$agent->id] ?? 0)),
                ])
                ->filter(fn (array $match): bool => $match['score'] > 0)
                ->sortByDesc('score')
                ->values()
                ->all();
            $scored = array_values($scored);

            if ($agency !== null) {
                $seenAgencies[$agency->id] = true;

                if ($scored === []) {
                    continue;
                }

                $best = $scored[0];
                $rows[] = [
                    'agency' => $agency,
                    'agents' => $scored,
                    'score' => $best['score'],
                    'reasons' => $best['reasons'],
                    'available_properties' => $best['available'],
                ];

                continue;
            }

            // Indépendants : chacun sa ligne, il est sa propre agence.
            foreach ($scored as $match) {
                $rows[] = [
                    'agency' => null,
                    'agents' => [$match],
                    'score' => $match['score'],
                    'reasons' => $match['reasons'],
                    'available_properties' => $match['available'],
                ];
            }
        }

        // Une agence sans agent se note seule : son profil et son adresse parlent déjà.
        foreach ($agencies as $agency) {
            if (isset($seenAgencies[$agency->id])) {
                continue;
            }
            $match = self::score($lead, null, $agency, new EloquentCollection, $outcomes, 0);
            if ($match['score'] > 0) {
                $rows[] = ['agency' => $agency, 'agents' => [], 'score' => $match['score'], 'reasons' => $match['reasons'], 'available_properties' => 0];
            }
        }

        usort($rows, fn (array $a, array $b): int => [$b['score'], $a['agency']->name ?? ''] <=> [$a['score'], $b['agency']->name ?? '']);

        return array_slice($rows, 0, $limit);
    }

    /**
     * Note d'un agent (ou d'une agence seule) pour ce dossier. L'agent hérite du
     * profil et de l'adresse de son agence là où il n'a rien de propre.
     *
     * @param  EloquentCollection<int, Property>  $properties  biens de l'agent
     * @param  Collection<int, Collection<int, LeadPropertyLink>>  $outcomes  suites données, par bien
     * @return array{score: int, reasons: list<string>, available: int}
     */
    public static function score(Lead $lead, ?Agent $agent, ?Agency $agency, EloquentCollection $properties, Collection $outcomes, int $visitsDone): array
    {
        $score = 0;
        $reasons = [];
        $targets = array_map(intval(...), $lead->districts ?? []);
        $around = ParisArrondissements::neighbours($targets);

        // Territoire : là où l'agent a des biens, ce qu'il déclare couvrir, où il est installé.
        if ($targets !== []) {
            $inTargets = $properties->filter(fn (Property $property): bool => in_array($property->district, $targets, true))->count();
            $nearby = $properties->filter(fn (Property $property): bool => in_array($property->district, $around, true))->count();
            if ($inTargets > 0) {
                $score += 3;
                $reasons[] = $inTargets === 1 ? '1 bien dans les quartiers visés' : "{$inTargets} biens dans les quartiers visés";
            } elseif ($nearby > 0) {
                $score += 1;
                $reasons[] = 'Des biens dans les quartiers voisins';
            }

            $covered = array_map(intval(...), $agent?->districts ?: ($agency->districts ?? []));
            $common = array_values(array_intersect($covered, $targets));
            if ($common !== []) {
                $score += 2;
                $reasons[] = 'Couvre le '.implode(', ', array_map(self::ordinal(...), $common));
            }

            $home = ParisArrondissements::fromPostalCode($agency instanceof Agency ? $agency->postal_code : $agent?->postal_code);
            if ($home !== null && in_array($home, $targets, true)) {
                $score += 1;
                $reasons[] = 'Installée dans le '.self::ordinal($home);
            }
        }

        // Segment : le genre de biens que l'agent tient, comparé au projet.
        $withRent = $properties->filter(fn (Property $property): bool => $property->rent_cents !== null && $property->currency === $lead->currency);
        if ($lead->budget_cents !== null && $withRent->isNotEmpty()) {
            $median = self::median(array_values($withRent->map(fn (Property $property): int => (int) $property->rent_cents)->all()));
            if ($median <= $lead->budget_cents * 1.2 && $median >= $lead->budget_cents * 0.6) {
                $score += 2;
                $reasons[] = 'Loyers dans la gamme du budget';
            }
        }
        if ($lead->budget_cents !== null && $agency?->rent_min_cents !== null && $agency->rent_max_cents !== null
            && $lead->budget_cents >= $agency->rent_min_cents && $lead->budget_cents <= $agency->rent_max_cents) {
            $score += 1;
            $reasons[] = 'Budget dans sa gamme annoncée';
        }

        $types = $lead->property_types;
        if ($types !== null && $types->isNotEmpty() && $properties->isNotEmpty()) {
            $matching = $properties->filter(fn (Property $property): bool => $property->property_type !== null && $types->contains($property->property_type))->count();
            if ($matching * 3 >= $properties->count()) {
                $score += 1;
                $reasons[] = 'Habitué au type de bien recherché';
            }
        }

        $specialties = self::specialties($agent, $agency);
        if ($lead->furnished !== null && $lead->furnished !== Furnished::Either) {
            $wanted = $lead->furnished === Furnished::Furnished ? AgencySpecialty::Furnished : AgencySpecialty::Unfurnished;
            $share = $properties->filter(fn (Property $property): bool => $property->furnished === $lead->furnished)->count();
            if ($specialties->contains($wanted) || ($properties->isNotEmpty() && $share * 2 >= $properties->count())) {
                $score += 1;
                $reasons[] = 'Spécialiste du '.mb_strtolower($lead->furnished->label());
            }
        }

        $languages = self::languages($agent, $agency);
        if ($lead->language === LeadLanguage::English) {
            if ($languages->contains(SpokenLanguage::English)) {
                $score += 2;
                $reasons[] = 'Parle anglais';
            }
            if ($specialties->contains(AgencySpecialty::Expats)) {
                $score += 1;
                $reasons[] = 'Habituée aux expatriés';
            }
            if ($agency?->accepts_foreign_files === true) {
                $score += 2;
                $reasons[] = 'Accepte les dossiers étrangers';
            }
        }
        if (($lead->guarantors?->contains(GuarantorType::Garantme) ?? false) && $agency?->accepts_garantme === true) {
            $score += 2;
            $reasons[] = 'Accepte Garantme';
        }

        // Résultats : ce que les dossiers passés par cet agent sont devenus.
        $accepted = 0;
        $applied = 0;
        $rejected = 0;
        foreach ($properties as $property) {
            foreach ($outcomes->get($property->id) ?? [] as $link) {
                match ($link->status) {
                    PropertyApplicationStatus::Accepted => $accepted++,
                    PropertyApplicationStatus::Applied => $applied++,
                    PropertyApplicationStatus::Rejected => $rejected++,
                    default => null,
                };
            }
        }
        if ($accepted > 0) {
            $score += 3;
            $reasons[] = $accepted === 1 ? '1 dossier accepté avec cet agent' : "{$accepted} dossiers acceptés avec cet agent";
        } elseif ($applied > 0) {
            $score += 1;
            $reasons[] = 'Des dossiers déposés avec cet agent';
        }
        if ($rejected > $accepted) {
            $score -= 1;
        }
        if ($visitsDone > 0) {
            $score += min($visitsDone, 2);
            $reasons[] = $visitsDone === 1 ? '1 visite réalisée ensemble' : "{$visitsDone} visites réalisées ensemble";
        }

        // Disponibilité : des biens libres qui collent au projet, maintenant.
        $available = $properties
            ->filter(fn (Property $property): bool => $property->isAvailable() && SuggestClientProperties::score($lead, $property)['score'] > 0)
            ->count();
        if ($available > 0) {
            $score += 3;
            $reasons[] = $available === 1 ? '1 bien disponible qui correspond' : "{$available} biens disponibles qui correspondent";
        }

        // Relation : comment ça se passe avec lui.
        $quality = $agent?->relationship_quality;
        if ($quality === RelationshipQuality::Excellent) {
            $score += 2;
            $reasons[] = 'Excellente relation';
        } elseif ($quality === RelationshipQuality::Good) {
            $score += 1;
            $reasons[] = 'Bonne relation';
        } elseif ($quality === RelationshipQuality::Difficult) {
            $score -= 2;
        }
        $lastContact = $agent instanceof Agent ? $agent->last_contacted_at ?? $agency?->last_contacted_at : ($agency?->last_contacted_at);
        if ($lastContact !== null && $lastContact->diffInDays(now()) <= self::RECENT_CONTACT_DAYS) {
            $score += 1;
            $reasons[] = 'Contact récent';
        }
        $favorite = $agent instanceof Agent ? $agent->is_favorite : $agency?->is_favorite;
        if ($favorite === true) {
            $score += 1;
            $reasons[] = 'Favori du conseiller';
        }

        return ['score' => $score, 'reasons' => $reasons, 'available' => $available];
    }

    /**
     * Forme envoyée au front pour une ligne (agence ou indépendant).
     *
     * @param  array{agency: Agency|null, agents: list<array{agent: Agent, score: int, reasons: list<string>, available: int}>, score: int, reasons: list<string>, available_properties: int}  $row
     * @return array<string, mixed>
     */
    public static function summary(array $row): array
    {
        $agency = $row['agency'];
        $agents = array_map(fn (array $match): array => [
            'id' => $match['agent']->id,
            'uuid' => $match['agent']->uuid,
            'name' => $match['agent']->fullName(),
            'position' => $match['agent']->position?->label(),
            'phone' => $match['agent']->phone,
            'email' => $match['agent']->email,
            'relationship_quality' => $match['agent']->relationship_quality?->value,
            'relationship_quality_label' => $match['agent']->relationship_quality?->label(),
            'is_primary' => $match['agent']->is_primary,
            'score' => $match['score'],
            'reasons' => $match['reasons'],
        ], $row['agents']);

        return [
            'key' => $agency === null ? 'agent:'.$row['agents'][0]['agent']->id : 'agency:'.$agency->id,
            'agency' => $agency === null ? null : [
                'id' => $agency->id,
                'uuid' => $agency->uuid,
                'name' => $agency->name,
                'city' => $agency->city,
                'postal_code' => $agency->postal_code,
                'phone' => $agency->phone,
                'email' => $agency->email,
                'website' => $agency->website,
                'has_profile' => $agency->hasProfile(),
            ],
            'agents' => $agents,
            'best_agent' => $agents[0] ?? null,
            'score' => $row['score'],
            'reasons' => $row['reasons'],
            'available_properties' => $row['available_properties'],
        ];
    }

    /**
     * @return Collection<int, AgencySpecialty>
     */
    private static function specialties(?Agent $agent, ?Agency $agency): Collection
    {
        $own = $agent?->specialties;
        if ($own !== null && $own->isNotEmpty()) {
            return $own;
        }

        return $agency instanceof Agency ? $agency->specialties ?? new Collection : (new Collection);
    }

    /**
     * @return Collection<int, SpokenLanguage>
     */
    private static function languages(?Agent $agent, ?Agency $agency): Collection
    {
        $own = $agent?->languages;
        if ($own !== null && $own->isNotEmpty()) {
            return $own;
        }

        return $agency instanceof Agency ? $agency->languages ?? new Collection : (new Collection);
    }

    /**
     * @param  list<int>  $values
     */
    private static function median(array $values): float
    {
        sort($values);
        $count = count($values);
        $middle = intdiv($count, 2);

        return $count % 2 === 1 ? (float) $values[$middle] : ($values[$middle - 1] + $values[$middle]) / 2;
    }

    private static function ordinal(int $district): string
    {
        return $district === 1 ? '1er' : "{$district}e";
    }
}

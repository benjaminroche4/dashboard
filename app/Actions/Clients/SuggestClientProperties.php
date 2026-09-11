<?php

declare(strict_types=1);

namespace App\Actions\Clients;

use App\Enums\Furnished;
use App\Models\Lead;
use App\Models\Property;

/**
 * Biens de l'annuaire qui correspondent au projet d'un client (arrondissements,
 * budget, type de bien, meublé), hors biens déjà rattachés ou déjà visités.
 * Chaque suggestion porte un score et les critères remplis, en clair.
 */
final class SuggestClientProperties
{
    public const int LIMIT = 5;

    /** Tolérance au-dessus du budget encore proposée (10 %). */
    private const float BUDGET_TOLERANCE = 1.1;

    /**
     * @return list<array{property: Property, score: int, reasons: list<string>}>
     */
    public function handle(Lead $lead, int $limit = self::LIMIT): array
    {
        $excluded = $lead->properties()->pluck('properties.id')
            ->merge($lead->visits()->pluck('property_id'))
            ->unique()
            ->all();

        return array_values(Property::query()
            // Un bien attribué à un client est pris : jamais suggéré.
            ->unassigned()
            ->with('agent')
            ->whereKeyNot($excluded)
            ->get()
            ->map(fn (Property $property): array => [...self::score($lead, $property), 'property' => $property])
            ->filter(fn (array $match): bool => $match['score'] > 0)
            ->sortBy([['score', 'desc'], ['property.created_at', 'desc']])
            ->take($limit)
            ->all());
    }

    /**
     * Score d'un bien pour ce client, avec les critères remplis. Le budget et
     * le quartier pèsent le plus ; un loyer trop cher élimine le bien.
     *
     * @return array{score: int, reasons: list<string>}
     */
    public static function score(Lead $lead, Property $property): array
    {
        $score = 0;
        $reasons = [];

        if ($lead->budget_cents !== null && $property->rent_cents !== null && $property->currency === $lead->currency) {
            if ($property->rent_cents <= $lead->budget_cents) {
                $score += 3;
                $reasons[] = 'Dans le budget';
            } elseif ($property->rent_cents <= (int) round($lead->budget_cents * self::BUDGET_TOLERANCE)) {
                $score += 1;
                $reasons[] = 'Budget dépassé de moins de 10 %';
            } else {
                return ['score' => 0, 'reasons' => []];
            }
        }

        $districts = $lead->districts ?? [];
        if ($property->district !== null && $districts !== [] && in_array($property->district, $districts, true)) {
            $score += 3;
            $reasons[] = "Arrondissement recherché ({$property->district}e)";
        }

        $types = $lead->property_types;
        if ($property->property_type !== null && $types !== null && $types->contains($property->property_type)) {
            $score += 2;
            $reasons[] = 'Type de bien recherché ('.$property->property_type->label().')';
        }

        if ($lead->furnished !== null && $property->furnished !== null && $lead->furnished !== Furnished::Either) {
            if ($property->furnished === $lead->furnished || $property->furnished === Furnished::Either) {
                $score += 1;
                $reasons[] = $lead->furnished->label();
            }
        }

        return ['score' => $score, 'reasons' => $reasons];
    }

    /**
     * Forme envoyée au front pour une suggestion.
     *
     * @param  array{property: Property, score: int, reasons: list<string>}  $match
     * @return array<string, mixed>
     */
    public static function summary(array $match): array
    {
        $property = $match['property'];

        return [
            'id' => $property->id,
            'uuid' => $property->uuid,
            'label' => $property->label(),
            'street' => $property->street,
            'postal_code' => $property->postal_code,
            'city' => $property->city,
            'property_type_label' => $property->property_type?->label(),
            'furnished_label' => $property->furnished?->label(),
            'surface_m2' => $property->surface_m2,
            'rent_cents' => $property->rent_cents,
            'currency' => $property->currency->value,
            'listing_url' => $property->listing_url,
            'agent' => $property->agent?->fullName(),
            'score' => $match['score'],
            'reasons' => $match['reasons'],
        ];
    }
}

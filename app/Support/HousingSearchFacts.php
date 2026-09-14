<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\Lead;

/**
 * Les faits d'une recherche tels qu'on les présente à une agence : le projet,
 * jamais les coordonnées du client — les réponses vont au conseiller.
 */
final class HousingSearchFacts
{
    /**
     * @return array<string, string>
     */
    public static function for(Lead $lead): array
    {
        $districts = array_map(intval(...), $lead->districts ?? []);
        sort($districts);
        $incomes = $lead->householdIncomeCents();

        return array_filter([
            'Type de bien' => $lead->property_types?->map(fn ($type): string => $type->label())->implode(', ') ?: null,
            'Meublé' => $lead->furnished?->label(),
            'Arrondissements' => $districts === [] ? null : implode(', ', array_map(fn (int $d): string => $d === 1 ? '1er' : "{$d}e", $districts)),
            'Budget mensuel' => $lead->budget_cents === null ? null : number_format($lead->budget_cents / 100, 0, ',', ' ').' '.$lead->currency->value.' charges comprises',
            'Emménagement' => $lead->arrival_at?->timezone('Europe/Paris')->translatedFormat('j F Y'),
            'Durée' => $lead->duration?->label(),
            'Foyer' => $lead->co_first_name === null ? null : 'Deux locataires',
            'Garants' => $lead->guarantors?->map(fn ($type): string => $type->label())->implode(', ') ?: null,
            'Revenus du foyer' => $incomes === null || $incomes === 0 ? null : number_format($incomes / 100, 0, ',', ' ').' € nets par mois',
            'Langue' => $lead->language->label(),
        ], fn (?string $value): bool => $value !== null && $value !== '');
    }
}

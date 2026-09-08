<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Fonctions d'un membre de l'équipe, affichées partout où l'on choisit un
 * membre (dossiers, visites, attribution des leads).
 */
enum StaffFunction: string
{
    case Dossiers = 'dossiers';
    case Visits = 'visits';
    case Closing = 'closing';
    case Prospecting = 'prospecting';
    case Billing = 'billing';
    case Partners = 'partners';

    public function label(): string
    {
        return match ($this) {
            self::Dossiers => 'Gestion des dossiers',
            self::Visits => 'Agent de visite',
            self::Closing => 'Closing et devis',
            self::Prospecting => 'Prospection propriétaires',
            self::Billing => 'Facturation',
            self::Partners => 'Relations partenaires',
        };
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    public static function options(): array
    {
        return array_map(
            fn (self $case): array => ['value' => $case->value, 'label' => $case->label()],
            self::cases(),
        );
    }
}

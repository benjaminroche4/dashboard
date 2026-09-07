<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Fonction d'un agent immobilier, choisie dans une liste fermée.
 * Miroir front : resources/js/lib/agent-positions.ts.
 */
enum AgentPosition: string
{
    case Negotiator = 'negotiator';
    case Advisor = 'advisor';
    case AgencyDirector = 'agency_director';
    case RentalManager = 'rental_manager';
    case PropertyManager = 'property_manager';
    case Assistant = 'assistant';
    case Independent = 'independent';
    case Other = 'other';

    public function label(): string
    {
        return match ($this) {
            self::Negotiator => 'Négociateur',
            self::Advisor => 'Conseiller immobilier',
            self::AgencyDirector => 'Directeur d’agence',
            self::RentalManager => 'Gestionnaire locatif',
            self::PropertyManager => 'Property manager',
            self::Assistant => 'Assistant commercial',
            self::Independent => 'Agent indépendant',
            self::Other => 'Autre',
        };
    }

    /**
     * Libellés alternatifs reconnus à l'import (féminins, variantes courantes).
     *
     * @return list<string>
     */
    public function aliases(): array
    {
        return match ($this) {
            self::Negotiator => ['négociatrice', 'negociateur', 'negociatrice'],
            self::Advisor => ['conseillère immobilière', 'conseiller', 'conseillère'],
            self::AgencyDirector => ['directrice d’agence', "directeur d'agence", "directrice d'agence", 'directeur', 'directrice', 'gérant', 'gérante'],
            self::RentalManager => ['gestionnaire locative', 'gestionnaire'],
            self::PropertyManager => [],
            self::Assistant => ['assistante commerciale', 'assistant', 'assistante'],
            self::Independent => ['indépendant', 'indépendante', 'agent indépendante', 'mandataire'],
            self::Other => [],
        };
    }

    /**
     * Valeur, libellé ou alias (insensible à la casse) → fonction ; vide → null ;
     * texte inconnu → « Autre », pour ne rien perdre à l'import.
     */
    public static function parse(?string $value): ?self
    {
        $needle = mb_strtolower(trim((string) $value));

        if ($needle === '') {
            return null;
        }

        foreach (self::cases() as $case) {
            if ($needle === $case->value || $needle === mb_strtolower($case->label()) || in_array($needle, $case->aliases(), true)) {
                return $case;
            }
        }

        return self::Other;
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    public static function options(): array
    {
        return array_map(fn (self $case): array => ['value' => $case->value, 'label' => $case->label()], self::cases());
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}

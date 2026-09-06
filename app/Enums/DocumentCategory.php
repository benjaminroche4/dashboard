<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Catégories du catalogue de pièces justificatives, dans l'ordre d'affichage.
 */
enum DocumentCategory: string
{
    case Studies = 'studies';
    case Finance = 'finance';
    case Guarantee = 'guarantee';
    case Housing = 'housing';
    case Identity = 'identity';
    case Other = 'other';
    case Work = 'work';

    public function label(): string
    {
        return match ($this) {
            self::Studies => 'Études',
            self::Finance => 'Finance',
            self::Guarantee => 'Garantie',
            self::Housing => 'Logement',
            self::Identity => 'Identité',
            self::Other => 'Autres',
            self::Work => 'Travail',
        };
    }
}

<?php

declare(strict_types=1);

namespace App\Support;

use App\Data\PropertyData;
use App\Enums\PropertyType;

/**
 * Nom d'un bien, **toujours calculé** depuis ses caractéristiques : personne
 * ne le saisit à la main, deux biens comparables se lisent donc pareil
 * (« T2 meublé · 42 m² · 11e »). À défaut de caractéristiques, la rue fait le nom.
 */
final readonly class PropertyTitle
{
    public static function for(PropertyData $data): string
    {
        // « T2 meublé » tient sur un seul segment : « meublé » qualifie le type,
        // il ne nomme rien tout seul.
        $kind = $data->propertyType instanceof PropertyType ? trim(implode(' ', array_filter([
            $data->propertyType->label(),
            $data->furnished?->titlePart(),
        ]))) : null;

        $surface = $data->surfaceM2 === null ? null : "{$data->surfaceM2} m²";

        // Un arrondissement ne nomme pas un logement : sans type ni surface,
        // la rue reste le nom le plus parlant.
        if ($kind === null && $surface === null) {
            return $data->street;
        }

        $parts = array_filter([$kind, $surface, self::place($data)], fn (?string $part): bool => $part !== null && $part !== '');

        return implode(' · ', $parts);
    }

    /** Arrondissement parisien, sinon la ville. */
    private static function place(PropertyData $data): ?string
    {
        if ($data->district !== null) {
            return $data->district === 1 ? '1er' : "{$data->district}e";
        }

        $city = trim((string) $data->city);

        return $city === '' ? null : $city;
    }
}

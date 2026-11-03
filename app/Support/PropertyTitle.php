<?php

declare(strict_types=1);

namespace App\Support;

use App\Data\PropertyData;
use App\Enums\Furnished;
use App\Enums\PropertyType;
use App\Models\Property;

/**
 * Nom d'un bien, **toujours calculé** depuis ses caractéristiques : personne
 * ne le saisit à la main, deux biens comparables se lisent donc pareil
 * (« T2 meublé · 42 m² · 11e »). À défaut de caractéristiques, la rue fait le nom.
 */
final readonly class PropertyTitle
{
    public static function for(PropertyData $data): string
    {
        return self::compose($data->street, $data->propertyType, $data->furnished, $data->surfaceM2, $data->district, $data->city);
    }

    /** Le nom d'un bien déjà enregistré (modification en place depuis sa fiche). */
    public static function forProperty(Property $property): string
    {
        return self::compose($property->street, $property->property_type, $property->furnished, $property->surface_m2, $property->district, $property->city);
    }

    private static function compose(string $street, ?PropertyType $type, ?Furnished $furnished, ?int $surfaceM2, ?int $district, ?string $city): string
    {
        // « T2 meublé » tient sur un seul segment : « meublé » qualifie le type,
        // il ne nomme rien tout seul.
        $kind = $type instanceof PropertyType ? trim(implode(' ', array_filter([
            $type->label(),
            $furnished?->titlePart(),
        ]))) : null;

        $surface = $surfaceM2 === null ? null : "{$surfaceM2} m²";

        // Un arrondissement ne nomme pas un logement : sans type ni surface,
        // la rue reste le nom le plus parlant.
        if ($kind === null && $surface === null) {
            return $street;
        }

        $parts = array_filter([$kind, $surface, self::place($district, $city)], fn (?string $part): bool => $part !== null && $part !== '');

        return implode(' · ', $parts);
    }

    /** Arrondissement parisien, sinon la ville. */
    private static function place(?int $district, ?string $city): ?string
    {
        if ($district !== null) {
            return $district === 1 ? '1er' : "{$district}e";
        }

        $city = trim((string) $city);

        return $city === '' ? null : $city;
    }
}

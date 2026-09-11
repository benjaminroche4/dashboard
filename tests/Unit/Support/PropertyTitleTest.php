<?php

declare(strict_types=1);

use App\Data\PropertyData;
use App\Support\PropertyTitle;

/** Bien saisi au minimum, complété par ce que le test veut éprouver. */
function propertyData(array $fields = []): PropertyData
{
    return PropertyData::from([
        'street' => '5 rue de Bretagne',
        'currency' => 'EUR',
        ...$fields,
    ]);
}

test('a property is named after its characteristics', function (): void {
    expect(PropertyTitle::for(propertyData([
        'property_type' => 't2',
        'furnished' => 'furnished',
        'surface_m2' => 42,
        'postal_code' => '75011',
    ])))->toBe('T2 meublé · 42 m² · 11e');

    // « Non meublé » et « Indifférent » ne disent rien du logement.
    expect(PropertyTitle::for(propertyData([
        'property_type' => 't3',
        'furnished' => 'unfurnished',
        'district' => 1,
    ])))->toBe('T3 · 1er');
    expect(PropertyTitle::for(propertyData([
        'property_type' => 'studio',
        'furnished' => 'either',
        'surface_m2' => 18,
        'city' => 'Boulogne-Billancourt',
    ])))->toBe('Studio · 18 m² · Boulogne-Billancourt');
});

test('without a type or a surface, the street stays the name', function (): void {
    // Un arrondissement seul ne nomme pas un logement.
    expect(PropertyTitle::for(propertyData(['postal_code' => '75011'])))
        ->toBe('5 rue de Bretagne');
    expect(PropertyTitle::for(propertyData(['furnished' => 'furnished'])))
        ->toBe('5 rue de Bretagne');
    // La surface seule suffit, elle.
    expect(PropertyTitle::for(propertyData(['surface_m2' => 42, 'district' => 3])))
        ->toBe('42 m² · 3e');
});

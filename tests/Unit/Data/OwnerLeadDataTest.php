<?php

declare(strict_types=1);

use App\Data\LeadPropertyData;
use App\Data\OwnerLeadData;
use App\Enums\Furnished;
use App\Enums\LeadSegment;
use App\Enums\LeaseType;
use App\Enums\Orientation;
use App\Enums\OwnerPropertyType;
use App\Enums\PropertyAmenity;
use App\Enums\PropertyStatus;

it('builds an owner lead with its property, blanks becoming null', function (): void {
    $data = OwnerLeadData::from([
        'first_name' => 'zoé',
        'last_name' => 'martin',
        'email' => 'zoe@example.com',
        'phone' => '',
        'company' => '  ',
        'property' => [
            'address' => ' 12 rue de Rivoli, Paris ',
            'place_id' => '',
            'property_type' => 't2',
            'property_status' => 'available',
            'bedrooms' => '1',
            'bathrooms' => 1,
            'surface' => '45',
            'floor' => '3',
            'building_floors' => '6',
            'furnishing' => 'furnished',
            'orientations' => ['south', 'west'],
            'lease_types' => ['alur'],
            'rent_cents' => 150_000,
            'charges_cents' => '',
            'deposit_cents' => null,
            'amenities' => ['elevator', 'balcony'],
            'note' => '',
        ],
    ]);

    expect($data->lead->segment)->toBe(LeadSegment::Owner)
        ->and($data->lead->firstName)->toBe('Zoé')
        ->and($data->lead->company)->toBeNull()
        ->and($data->property)->toBeInstanceOf(LeadPropertyData::class)
        ->and($data->property?->address)->toBe('12 rue de Rivoli, Paris')
        ->and($data->property?->placeId)->toBeNull()
        ->and($data->property?->propertyType)->toBe(OwnerPropertyType::T2)
        ->and($data->property?->propertyStatus)->toBe(PropertyStatus::Available)
        ->and($data->property?->bedrooms)->toBe(1)
        ->and($data->property?->surface)->toBe(45)
        ->and($data->property?->furnishing)->toBe(Furnished::Furnished)
        ->and($data->property?->orientations)->toBe([Orientation::South, Orientation::West])
        ->and($data->property?->leaseTypes)->toBe([LeaseType::Alur])
        ->and($data->property?->rentCents)->toBe(150_000)
        ->and($data->property?->chargesCents)->toBeNull()
        ->and($data->property?->amenities)->toBe([PropertyAmenity::Elevator, PropertyAmenity::Balcony])
        ->and($data->property?->note)->toBeNull()
        ->and($data->toArray()['property']['surface'])->toBe(45);
});

it('drops an empty property and reports emptiness', function (): void {
    $empty = LeadPropertyData::from(['address' => '', 'orientations' => [], 'amenities' => [], 'rent_cents' => '']);

    expect($empty->isEmpty())->toBeTrue()
        ->and(LeadPropertyData::from(['surface' => 0])->isEmpty())->toBeFalse()
        ->and(OwnerLeadData::from(['first_name' => 'a', 'last_name' => 'b', 'phone' => '06', 'property' => ['note' => ' ']])->property)->toBeNull()
        ->and(OwnerLeadData::from(['first_name' => 'a', 'last_name' => 'b', 'phone' => '06'])->property)->toBeNull();
});

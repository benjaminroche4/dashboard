<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\Furnished;
use App\Enums\LeaseType;
use App\Enums\Orientation;
use App\Enums\OwnerPropertyType;
use App\Enums\PropertyAmenity;
use App\Enums\PropertyStatus;
use Carbon\CarbonInterface;
use Database\Factories\LeadPropertyFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\AsEnumCollection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Collection;

/**
 * Bien proposé à la location par un lead propriétaire.
 *
 * @property int $id
 * @property int $lead_id
 * @property string|null $address
 * @property string|null $place_id
 * @property OwnerPropertyType|null $property_type
 * @property PropertyStatus|null $property_status
 * @property int|null $bedrooms
 * @property int|null $bathrooms
 * @property int|null $surface
 * @property int|null $floor
 * @property int|null $building_floors
 * @property Furnished|null $furnishing
 * @property Collection<int, Orientation>|null $orientations
 * @property Collection<int, LeaseType>|null $lease_types
 * @property int|null $rent_cents
 * @property int|null $charges_cents
 * @property int|null $deposit_cents
 * @property Collection<int, PropertyAmenity>|null $amenities
 * @property string|null $note
 * @property CarbonInterface|null $created_at
 * @property CarbonInterface|null $updated_at
 * @property-read Lead $lead
 */
#[Fillable([
    'lead_id', 'address', 'place_id', 'property_type', 'property_status', 'bedrooms', 'bathrooms', 'surface', 'floor', 'building_floors',
    'furnishing', 'orientations', 'lease_types', 'rent_cents', 'charges_cents', 'deposit_cents', 'amenities', 'note',
])]
class LeadProperty extends Model
{
    /** @use HasFactory<LeadPropertyFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'property_type' => OwnerPropertyType::class,
            'property_status' => PropertyStatus::class,
            'bedrooms' => 'integer',
            'bathrooms' => 'integer',
            'surface' => 'integer',
            'floor' => 'integer',
            'building_floors' => 'integer',
            'furnishing' => Furnished::class,
            'orientations' => AsEnumCollection::of(Orientation::class),
            'lease_types' => AsEnumCollection::of(LeaseType::class),
            'rent_cents' => 'integer',
            'charges_cents' => 'integer',
            'deposit_cents' => 'integer',
            'amenities' => AsEnumCollection::of(PropertyAmenity::class),
        ];
    }

    /**
     * @return BelongsTo<Lead, $this>
     */
    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }
}

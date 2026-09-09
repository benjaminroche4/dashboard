<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\Currency;
use App\Enums\Furnished;
use App\Enums\LeaseType;
use App\Enums\PropertyStatus;
use App\Enums\PropertyType;
use Carbon\CarbonInterface;
use Database\Factories\PropertyFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

/**
 * Bien de l'annuaire « Biens » : un logement que l'équipe peut proposer et faire visiter.
 *
 * @property int $id
 * @property string $uuid
 * @property string|null $title
 * @property string $street
 * @property string|null $postal_code
 * @property string|null $city
 * @property int|null $district
 * @property PropertyStatus $status
 * @property float|null $latitude
 * @property float|null $longitude
 * @property PropertyType|null $property_type
 * @property Furnished|null $furnished
 * @property int|null $rooms
 * @property int|null $surface_m2
 * @property int|null $floor
 * @property LeaseType|null $lease_type
 * @property int|null $rent_cents
 * @property int|null $charges_cents
 * @property Currency $currency
 * @property string|null $listing_url
 * @property int|null $agent_id
 * @property int|null $owner_id
 * @property list<string>|null $photos
 * @property string|null $notes
 * @property int|null $created_by
 * @property CarbonInterface|null $created_at
 * @property CarbonInterface|null $updated_at
 * @property-read Agent|null $agent
 * @property-read Owner|null $owner
 * @property-read User|null $creator
 * @property-read Collection<int, Visit> $visits
 */
#[Fillable(['title', 'street', 'postal_code', 'city', 'district', 'status', 'property_type', 'furnished', 'rooms', 'surface_m2', 'floor', 'lease_type', 'rent_cents', 'charges_cents', 'currency', 'listing_url', 'agent_id', 'owner_id', 'photos', 'notes', 'created_by'])]
class Property extends Model
{
    /** @use HasFactory<PropertyFactory> */
    use HasFactory;

    use HasUuids;

    /**
     * @return list<string>
     */
    public function uniqueIds(): array
    {
        return ['uuid'];
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'district' => 'integer',
            'status' => PropertyStatus::class,
            'latitude' => 'float',
            'longitude' => 'float',
            'property_type' => PropertyType::class,
            'furnished' => Furnished::class,
            'rooms' => 'integer',
            'surface_m2' => 'integer',
            'floor' => 'integer',
            'lease_type' => LeaseType::class,
            'rent_cents' => 'integer',
            'charges_cents' => 'integer',
            'currency' => Currency::class,
            'photos' => 'array',
        ];
    }

    /**
     * URL publiques des photos du bien.
     *
     * @return list<string>
     */
    public function photoUrls(): array
    {
        return array_map(fn (string $path): string => Storage::disk('public')->url($path), $this->photos ?? []);
    }

    /** Titre affiché : le titre saisi, sinon l'adresse. */
    public function label(): string
    {
        return $this->title ?? $this->street;
    }

    /**
     * @return BelongsTo<Agent, $this>
     */
    public function agent(): BelongsTo
    {
        return $this->belongsTo(Agent::class);
    }

    /**
     * @return BelongsTo<Owner, $this>
     */
    public function owner(): BelongsTo
    {
        return $this->belongsTo(Owner::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Dossiers clients auxquels le bien est rattaché.
     *
     * @return BelongsToMany<Lead, $this>
     */
    public function leads(): BelongsToMany
    {
        return $this->belongsToMany(Lead::class)->withPivot(['created_by'])->withTimestamps();
    }

    /**
     * @return HasMany<Visit, $this>
     */
    public function visits(): HasMany
    {
        return $this->hasMany(Visit::class);
    }
}

<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\Currency;
use App\Enums\Furnished;
use App\Enums\LeaseType;
use App\Enums\PropertyFloor;
use App\Enums\PropertyStatus;
use App\Enums\PropertyType;
use Carbon\CarbonInterface;
use Database\Factories\PropertyFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
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
 * @property list<array{kind: string, name: string, lines: list<string>, minutes: int|null}>|null $transit
 * @property PropertyStatus $status
 * @property float|null $latitude
 * @property float|null $longitude
 * @property PropertyType|null $property_type
 * @property Furnished|null $furnished
 * @property int|null $rooms
 * @property int|null $bedrooms
 * @property int|null $bathrooms
 * @property int|null $surface_m2
 * @property PropertyFloor|null $floor
 * @property int|null $building_floors
 * @property list<string>|null $orientations
 * @property list<string>|null $amenities
 * @property LeaseType|null $lease_type
 * @property int|null $rent_cents
 * @property int|null $charges_cents
 * @property bool $charges_included
 * @property int|null $deposit_cents
 * @property Currency $currency
 * @property string|null $listing_url
 * @property int|null $agent_id
 * @property int|null $owner_id
 * @property int|null $partner_id
 * @property int|null $assigned_lead_id
 * @property CarbonInterface|null $assigned_at
 * @property list<string>|null $photos
 * @property string|null $notes
 * @property int|null $created_by
 * @property CarbonInterface|null $created_at
 * @property CarbonInterface|null $updated_at
 * @property-read Agent|null $agent
 * @property-read Owner|null $owner
 * @property-read Partner|null $partner
 * @property-read User|null $creator
 * @property-read Collection<int, Visit> $visits
 */
#[Fillable(['title', 'street', 'postal_code', 'city', 'district', 'transit', 'status', 'property_type', 'furnished', 'rooms', 'bedrooms', 'bathrooms', 'surface_m2', 'floor', 'building_floors', 'orientations', 'amenities', 'lease_type', 'rent_cents', 'charges_cents', 'charges_included', 'deposit_cents', 'currency', 'listing_url', 'agent_id', 'owner_id', 'partner_id', 'assigned_lead_id', 'assigned_at', 'photos', 'notes', 'created_by'])]
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
            'assigned_at' => 'datetime',
            'district' => 'integer',
            'status' => PropertyStatus::class,
            'latitude' => 'float',
            'longitude' => 'float',
            'property_type' => PropertyType::class,
            'furnished' => Furnished::class,
            'rooms' => 'integer',
            'bedrooms' => 'integer',
            'bathrooms' => 'integer',
            'surface_m2' => 'integer',
            'floor' => PropertyFloor::class,
            'building_floors' => 'integer',
            'orientations' => 'array',
            'amenities' => 'array',
            'lease_type' => LeaseType::class,
            'rent_cents' => 'integer',
            'charges_cents' => 'integer',
            'charges_included' => 'boolean',
            'deposit_cents' => 'integer',
            'currency' => Currency::class,
            'photos' => 'array',
            'transit' => 'array',
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
     * Client à qui le bien est attribué : il est pris, plus proposé en visite.
     *
     * @return BelongsTo<Lead, $this>
     */
    public function assignedLead(): BelongsTo
    {
        return $this->belongsTo(Lead::class, 'assigned_lead_id');
    }

    /** Le bien est attribué à un client. */
    public function isAssigned(): bool
    {
        return $this->assigned_lead_id !== null;
    }

    /**
     * Bien encore proposable : son statut le permet **et** il n'est attribué à
     * personne. C'est la seule vérité à consulter pour « peut-on le proposer ».
     */
    public function isAvailable(): bool
    {
        return $this->status->isOpen() && ! $this->isAssigned();
    }

    /**
     * Biens encore proposables : ceux qui ne sont attribués à personne.
     *
     * @param  Builder<Property>  $query
     */
    protected function scopeUnassigned(Builder $query): void
    {
        $query->whereNull('assigned_lead_id');
    }

    /**
     * @return BelongsTo<Owner, $this>
     */
    public function owner(): BelongsTo
    {
        return $this->belongsTo(Owner::class);
    }

    /**
     * Partenaire rattaché au bien (gestion, assurance, déménagement…).
     *
     * @return BelongsTo<Partner, $this>
     */
    public function partner(): BelongsTo
    {
        return $this->belongsTo(Partner::class);
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

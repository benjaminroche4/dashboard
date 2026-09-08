<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\OwnerStatus;
use App\Support\ContactMatch;
use Carbon\CarbonInterface;
use Database\Factories\OwnerFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Propriétaire à prospecter pour la gestion locative.
 *
 * @property int $id
 * @property string $uuid
 * @property string $first_name
 * @property string $last_name
 * @property string|null $company
 * @property string|null $email
 * @property string|null $phone
 * @property string|null $street
 * @property string|null $postal_code
 * @property string|null $city
 * @property int $property_count
 * @property OwnerStatus $status
 * @property CarbonInterface|null $last_contacted_at
 * @property string|null $notes
 * @property int|null $lead_id
 * @property int|null $created_by
 * @property CarbonInterface|null $created_at
 * @property CarbonInterface|null $updated_at
 * @property-read User|null $creator
 * @property-read Lead|null $lead
 * @property-read Collection<int, Property> $properties
 */
#[Fillable(['first_name', 'last_name', 'company', 'email', 'phone', 'street', 'postal_code', 'city', 'property_count', 'status', 'last_contacted_at', 'notes', 'lead_id', 'created_by'])]
class Owner extends Model
{
    /** @use HasFactory<OwnerFactory> */
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
            'status' => OwnerStatus::class,
            'property_count' => 'integer',
            'last_contacted_at' => 'datetime',
        ];
    }

    public function fullName(): string
    {
        return trim("{$this->first_name} {$this->last_name}");
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Lead « gestion locative » créé depuis ce propriétaire.
     *
     * @return BelongsTo<Lead, $this>
     */
    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    /**
     * Biens de l'annuaire rattachés à ce propriétaire.
     *
     * @return HasMany<Property, $this>
     */
    public function properties(): HasMany
    {
        return $this->hasMany(Property::class);
    }

    /**
     * Propriétaires partageant l'e-mail (insensible à la casse) ou la fin du numéro.
     *
     * @param  Builder<Owner>  $query
     */
    protected function scopeMatchingContact(Builder $query, ?string $email, ?string $phone): void
    {
        ContactMatch::apply($query, $email, $phone);
    }
}

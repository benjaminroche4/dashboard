<?php

declare(strict_types=1);

namespace App\Models;

use App\Actions\Owners\UpdateOwnerPhoto;
use App\Enums\OwnerKind;
use App\Support\ContactMatch;
use App\Support\FileUrl;
use Carbon\CarbonInterface;
use Database\Factories\OwnerFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Propriétaire d'un ou plusieurs biens : un particulier, ou une société.
 *
 * @property int $id
 * @property string $uuid
 * @property OwnerKind $kind
 * @property string $first_name
 * @property string $last_name
 * @property string|null $company
 * @property string|null $email
 * @property string|null $phone
 * @property string|null $street
 * @property string|null $postal_code
 * @property string|null $city
 * @property string|null $notes
 * @property int|null $lead_id
 * @property string|null $photo_path
 * @property-read string|null $photo
 * @property float|null $latitude
 * @property float|null $longitude
 * @property CarbonInterface|null $last_contacted_at
 * @property int|null $created_by
 * @property CarbonInterface|null $created_at
 * @property CarbonInterface|null $updated_at
 * @property-read Lead|null $lead
 * @property-read User|null $creator
 * @property-read Collection<int, Property> $properties
 */
#[Fillable(['kind', 'first_name', 'last_name', 'company', 'email', 'phone', 'street', 'postal_code', 'city', 'notes', 'photo_path', 'lead_id', 'last_contacted_at', 'latitude', 'longitude', 'created_by'])]
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
     * URL de la photo (lien signé dans un bucket), ou null sans photo.
     *
     * @return Attribute<string|null, null>
     */
    protected function photo(): Attribute
    {
        return new Attribute(get: fn (): ?string => FileUrl::for(UpdateOwnerPhoto::DISK, $this->photo_path));
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'kind' => OwnerKind::class,
            'last_contacted_at' => 'datetime',
            'latitude' => 'float',
            'longitude' => 'float',
        ];
    }

    /** Nom de la personne ; pour une société, sa raison sociale. */
    public function fullName(): string
    {
        $name = trim("{$this->first_name} {$this->last_name}");

        if ($this->kind === OwnerKind::Company) {
            return $this->company ?? ($name === '' ? 'Société' : $name);
        }

        return $name;
    }

    /** Interlocuteur d'une société, quand il est renseigné. */
    public function contactName(): ?string
    {
        $name = trim("{$this->first_name} {$this->last_name}");

        return $this->kind === OwnerKind::Company && $name !== '' ? $name : null;
    }

    /**
     * Lead propriétaire d'où vient la fiche, quand elle en vient.
     *
     * @return BelongsTo<Lead, $this>
     */
    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
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

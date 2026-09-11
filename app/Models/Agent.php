<?php

declare(strict_types=1);

namespace App\Models;

use App\Concerns\Favoritable;
use App\Enums\AgentPosition;
use App\Enums\RelationshipQuality;
use App\Support\ContactMatch;
use Carbon\CarbonInterface;
use Database\Factories\AgentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Agent immobilier avec qui l'équipe travaille, rattaché ou non à une agence.
 *
 * @property int $id
 * @property string $uuid
 * @property int|null $agency_id
 * @property string $first_name
 * @property string $last_name
 * @property AgentPosition|null $position
 * @property RelationshipQuality|null $relationship_quality
 * @property string|null $street
 * @property string|null $postal_code
 * @property string|null $city
 * @property string|null $email
 * @property string|null $phone
 * @property string|null $notes
 * @property int|null $created_by
 * @property CarbonInterface|null $created_at
 * @property CarbonInterface|null $updated_at
 * @property bool $is_primary
 * @property CarbonInterface|null $last_contacted_at
 * @property float|null $latitude
 * @property float|null $longitude
 * @property-read Agency|null $agency
 * @property-read User|null $creator
 * @property-read Collection<int, Lead> $leads
 * @property-read Collection<int, Visit> $visits
 * @property int|null $visits_count
 * @property string|null $visits_max_scheduled_at
 */
#[Fillable(['agency_id', 'first_name', 'last_name', 'position', 'relationship_quality', 'is_primary', 'street', 'postal_code', 'city', 'email', 'phone', 'notes', 'latitude', 'longitude', 'last_contacted_at', 'created_by'])]
class Agent extends Model
{
    use Favoritable;

    /** @use HasFactory<AgentFactory> */
    use HasFactory;

    use HasUuids;

    /**
     * L'UUID est l'identifiant public (URL) ; l'identifiant numérique reste la clé primaire.
     *
     * @return list<string>
     */
    public function uniqueIds(): array
    {
        return ['uuid'];
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['position' => AgentPosition::class, 'relationship_quality' => RelationshipQuality::class, 'latitude' => 'float', 'longitude' => 'float', 'last_contacted_at' => 'datetime', 'is_primary' => 'boolean'];
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    public function fullName(): string
    {
        return trim("{$this->first_name} {$this->last_name}");
    }

    /**
     * @return BelongsTo<Agency, $this>
     */
    public function agency(): BelongsTo
    {
        return $this->belongsTo(Agency::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Visites faites avec cet agent, la plus récente d'abord.
     *
     * @return HasMany<Visit, $this>
     */
    public function visits(): HasMany
    {
        return $this->hasMany(Visit::class)->latest('scheduled_at');
    }

    /**
     * Leads dont cet agent est le contact.
     *
     * @return HasMany<Lead, $this>
     */
    public function leads(): HasMany
    {
        return $this->hasMany(Lead::class)->latest()->orderByDesc('id');
    }

    /**
     * Agents partageant l'e-mail (insensible à la casse) ou la fin du numéro.
     *
     * @param  Builder<Agent>  $query
     */
    protected function scopeMatchingContact(Builder $query, ?string $email, ?string $phone): void
    {
        ContactMatch::apply($query, $email, $phone);
    }
}

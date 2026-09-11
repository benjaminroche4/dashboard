<?php

declare(strict_types=1);

namespace App\Models;

use App\Concerns\Favoritable;
use App\Support\ContactMatch;
use Carbon\CarbonInterface;
use Database\Factories\AgencyFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

/**
 * Agence immobilière partenaire : coordonnées et agents rattachés.
 *
 * @property int $id
 * @property string $uuid
 * @property string $name
 * @property string|null $street
 * @property string|null $postal_code
 * @property string|null $city
 * @property string|null $phone
 * @property string|null $email
 * @property string|null $website
 * @property string|null $notes
 * @property int|null $created_by
 * @property CarbonInterface|null $created_at
 * @property CarbonInterface|null $updated_at
 * @property CarbonInterface|null $last_contacted_at
 * @property float|null $latitude
 * @property float|null $longitude
 * @property-read User|null $creator
 * @property-read Collection<int, Agent> $agents
 * @property-read Collection<int, Lead> $leads
 */
#[Fillable(['name', 'street', 'postal_code', 'city', 'phone', 'email', 'website', 'notes', 'latitude', 'longitude', 'last_contacted_at', 'created_by'])]
class Agency extends Model
{
    use Favoritable;

    /** @use HasFactory<AgencyFactory> */
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
        return ['latitude' => 'float', 'longitude' => 'float', 'last_contacted_at' => 'datetime'];
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * @return HasMany<Agent, $this>
     */
    public function agents(): HasMany
    {
        // L'agent principal ouvre la liste, partout où elle est affichée.
        return $this->hasMany(Agent::class)->orderByDesc('is_primary')->orderBy('last_name')->orderBy('first_name');
    }

    /**
     * Leads en contact avec l'un des agents de l'agence.
     *
     * @return HasManyThrough<Lead, Agent, $this>
     */
    public function leads(): HasManyThrough
    {
        return $this->hasManyThrough(Lead::class, Agent::class)->latest('leads.created_at')->orderByDesc('leads.id');
    }

    /**
     * Visites réalisées avec l'un des agents de l'agence : c'est ce qui dit si
     * l'on a déjà travaillé avec elle, mieux que le nombre de leads.
     *
     * @return HasManyThrough<Visit, Agent, $this>
     */
    public function visits(): HasManyThrough
    {
        return $this->hasManyThrough(Visit::class, Agent::class)->latest('visits.scheduled_at');
    }

    /**
     * Agences partageant l'e-mail (insensible à la casse) ou la fin du numéro.
     *
     * @param  Builder<Agency>  $query
     */
    protected function scopeMatchingContact(Builder $query, ?string $email, ?string $phone): void
    {
        ContactMatch::apply($query, $email, $phone);
    }
}

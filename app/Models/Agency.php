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
 * @property-read User|null $creator
 * @property-read Collection<int, Agent> $agents
 * @property-read Collection<int, Lead> $leads
 */
#[Fillable(['name', 'street', 'postal_code', 'city', 'phone', 'email', 'website', 'notes', 'created_by'])]
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
        return $this->hasMany(Agent::class)->orderBy('last_name')->orderBy('first_name');
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
     * Agences partageant l'e-mail (insensible à la casse) ou la fin du numéro.
     *
     * @param  Builder<Agency>  $query
     */
    protected function scopeMatchingContact(Builder $query, ?string $email, ?string $phone): void
    {
        ContactMatch::apply($query, $email, $phone);
    }
}

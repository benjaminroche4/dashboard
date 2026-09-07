<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\AgentPosition;
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
 * @property string|null $street
 * @property string|null $postal_code
 * @property string|null $city
 * @property string|null $email
 * @property string|null $phone
 * @property string|null $notes
 * @property int|null $created_by
 * @property CarbonInterface|null $created_at
 * @property CarbonInterface|null $updated_at
 * @property-read Agency|null $agency
 * @property-read User|null $creator
 * @property-read Collection<int, Lead> $leads
 */
#[Fillable(['agency_id', 'first_name', 'last_name', 'position', 'street', 'postal_code', 'city', 'email', 'phone', 'notes', 'created_by'])]
class Agent extends Model
{
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
        return ['position' => AgentPosition::class];
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

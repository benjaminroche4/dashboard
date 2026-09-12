<?php

declare(strict_types=1);

namespace App\Models;

use App\Concerns\Favoritable;
use App\Enums\PartnerType;
use App\Enums\RelationshipQuality;
use App\Support\ContactMatch;
use Carbon\CarbonInterface;
use Database\Factories\PartnerFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Partenaire de l'équipe : gestionnaire, assureur, banque, déménageur…
 *
 * @property int $id
 * @property string $uuid
 * @property string $name
 * @property PartnerType $type
 * @property RelationshipQuality|null $relationship_quality
 * @property CarbonInterface|null $last_contacted_at
 * @property string|null $email
 * @property string|null $phone
 * @property string|null $website
 * @property string|null $street
 * @property string|null $postal_code
 * @property string|null $city
 * @property string|null $notes
 * @property int|null $created_by
 * @property CarbonInterface|null $created_at
 * @property CarbonInterface|null $updated_at
 * @property float|null $latitude
 * @property float|null $longitude
 * @property-read User|null $creator
 * @property-read Collection<int, PartnerContact> $contacts
 * @property-read Collection<int, LeadPartner> $leadLinks
 */
#[Fillable(['name', 'type', 'relationship_quality', 'email', 'phone', 'website', 'street', 'postal_code', 'city', 'notes', 'last_contacted_at', 'latitude', 'longitude', 'created_by'])]
class Partner extends Model
{
    use Favoritable;

    /** @use HasFactory<PartnerFactory> */
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
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => PartnerType::class,
            'relationship_quality' => RelationshipQuality::class,
            'last_contacted_at' => 'datetime',
            'latitude' => 'float',
            'longitude' => 'float',
        ];
    }

    /** Interlocuteur principal, sinon le premier de la liste. */
    public function primaryContact(): ?PartnerContact
    {
        return $this->contacts->firstWhere('is_primary', true) ?? $this->contacts->first();
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Interlocuteurs chez le partenaire.
     *
     * @return HasMany<PartnerContact, $this>
     */
    public function contacts(): HasMany
    {
        // L'interlocuteur principal ouvre la liste, partout où elle est affichée.
        return $this->hasMany(PartnerContact::class)->orderByDesc('is_primary')->orderBy('last_name')->orderBy('first_name');
    }

    /**
     * Dossiers (leads) sur lesquels le partenaire intervient, avec le rôle.
     *
     * @return HasMany<LeadPartner, $this>
     */
    public function leadLinks(): HasMany
    {
        return $this->hasMany(LeadPartner::class)->latest()->orderByDesc('id');
    }

    /**
     * Devis adressés au partenaire, du plus récent au plus ancien.
     *
     * @return HasMany<Quote, $this>
     */
    public function quotes(): HasMany
    {
        return $this->hasMany(Quote::class)->latest('issued_at')->orderByDesc('id');
    }

    /**
     * Factures adressées au partenaire, de la plus récente à la plus ancienne.
     *
     * @return HasMany<Invoice, $this>
     */
    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class)->latest('issued_at')->orderByDesc('id');
    }

    /**
     * Partenaires portant exactement ce nom (insensible à la casse).
     *
     * @param  Builder<Partner>  $query
     */
    protected function scopeNamed(Builder $query, string $name): void
    {
        $query->whereRaw('lower(name) = ?', [mb_strtolower(trim($name))]);
    }

    /**
     * Partenaires partageant l'e-mail (insensible à la casse) ou la fin du numéro.
     *
     * @param  Builder<Partner>  $query
     */
    protected function scopeMatchingContact(Builder $query, ?string $email, ?string $phone): void
    {
        ContactMatch::apply($query, $email, $phone);
    }
}

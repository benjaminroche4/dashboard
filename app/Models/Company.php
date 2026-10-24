<?php

declare(strict_types=1);

namespace App\Models;

use App\Actions\Companies\UpdateCompanyLogo;
use App\Support\ContactMatch;
use App\Support\FileUrl;
use Carbon\CarbonInterface;
use Database\Factories\CompanyFactory;
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
 * Entreprise de l'annuaire : employeur ou société qui nous confie le
 * relogement de ses collaborateurs. Elle porte des contacts (plusieurs
 * principaux possibles) et les dossiers clients qui lui sont rattachés.
 *
 * @property int $id
 * @property string $uuid
 * @property string $name
 * @property string|null $email
 * @property string|null $phone
 * @property string|null $website
 * @property string|null $street
 * @property string|null $postal_code
 * @property string|null $city
 * @property string|null $notes
 * @property string|null $logo_path
 * @property-read string|null $logo
 * @property int|null $created_by
 * @property CarbonInterface|null $created_at
 * @property CarbonInterface|null $updated_at
 * @property-read User|null $creator
 * @property-read Collection<int, CompanyContact> $contacts
 * @property-read Collection<int, Lead> $clients
 */
#[Fillable(['name', 'email', 'phone', 'website', 'street', 'postal_code', 'city', 'notes', 'logo_path', 'created_by'])]
class Company extends Model
{
    /** @use HasFactory<CompanyFactory> */
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
     * URL du logo (lien signé dans un bucket), ou null sans logo.
     *
     * @return Attribute<string|null, null>
     */
    protected function logo(): Attribute
    {
        return new Attribute(get: fn (): ?string => FileUrl::for(UpdateCompanyLogo::DISK, $this->logo_path));
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Contacts dans l'entreprise, les principaux en tête.
     *
     * @return HasMany<CompanyContact, $this>
     */
    public function contacts(): HasMany
    {
        return $this->hasMany(CompanyContact::class)->orderByDesc('is_primary')->orderBy('last_name')->orderBy('first_name');
    }

    /**
     * Dossiers clients rattachés à l'entreprise (leads convertis ou clôturés).
     *
     * @return HasMany<Lead, $this>
     */
    public function clients(): HasMany
    {
        return $this->hasMany(Lead::class)->orderBy('last_name')->orderBy('first_name');
    }

    /**
     * Entreprises portant exactement ce nom (insensible à la casse).
     *
     * @param  Builder<Company>  $query
     */
    protected function scopeNamed(Builder $query, string $name): void
    {
        $query->whereRaw('lower(name) = ?', [mb_strtolower(trim($name))]);
    }

    /**
     * Entreprises partageant l'e-mail (insensible à la casse) ou la fin du numéro.
     *
     * @param  Builder<Company>  $query
     */
    protected function scopeMatchingContact(Builder $query, ?string $email, ?string $phone): void
    {
        ContactMatch::apply($query, $email, $phone);
    }
}

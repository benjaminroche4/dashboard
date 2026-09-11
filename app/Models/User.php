<?php

declare(strict_types=1);

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Enums\AccessLevel;
use App\Enums\SiteSection;
use App\Enums\StaffFunction;
use App\Enums\StaffRole;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Appends;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Laravel\Fortify\Contracts\PasskeyUser;
use Laravel\Fortify\PasskeyAuthenticatable;
use Laravel\Fortify\TwoFactorAuthenticatable;

/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property string|null $phone
 * @property StaffRole $role
 * @property array<string, string>|null $permissions
 * @property list<string>|null $functions
 * @property string|null $avatar_path
 * @property string $uuid
 * @property-read string|null $avatar
 * @property Carbon|null $email_verified_at
 * @property string $password
 * @property string|null $two_factor_secret
 * @property string|null $two_factor_recovery_codes
 * @property Carbon|null $two_factor_confirmed_at
 * @property string|null $remember_token
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'email', 'phone', 'password', 'role', 'permissions', 'functions', 'avatar_path'])]
#[Appends(['avatar'])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]
class User extends Authenticatable implements PasskeyUser
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, HasUuids, Notifiable, PasskeyAuthenticatable, TwoFactorAuthenticatable;

    /**
     * L'UUID est l'identifiant public (URL de la page Équipe) ; l'identifiant numérique reste la clé primaire.
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
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
            'role' => StaffRole::class,
            'permissions' => 'array',
            'functions' => 'array',
        ];
    }

    /**
     * URL publique de la photo de profil, ou null sans photo.
     *
     * @return Attribute<string|null, null>
     */
    protected function avatar(): Attribute
    {
        return new Attribute(get: fn (): ?string => $this->avatar_path === null
            ? null
            : Storage::disk('public')->url($this->avatar_path));
    }

    /**
     * Étoiles posées par ce membre sur des agents et des agences.
     *
     * @return HasMany<Favorite, $this>
     */
    public function favorites(): HasMany
    {
        return $this->hasMany(Favorite::class);
    }

    public function isAdmin(): bool
    {
        return $this->role->isAdmin();
    }

    /**
     * Niveau d'accès à une section : celui du rôle, sauf personnalisation ;
     * un administrateur gère toujours tout.
     */
    public function accessLevel(SiteSection $section): AccessLevel
    {
        if ($this->isAdmin()) {
            return AccessLevel::Manage;
        }

        $custom = $this->permissions[$section->value] ?? null;

        $level = (is_string($custom) ? AccessLevel::tryFrom($custom) : null) ?? $section->defaultLevel($this->role);

        return $section->clamp($level);
    }

    public function canRead(SiteSection ...$sections): bool
    {
        return $this->hasLevel(AccessLevel::Read, ...$sections);
    }

    public function canWrite(SiteSection ...$sections): bool
    {
        return $this->hasLevel(AccessLevel::Write, ...$sections);
    }

    public function canManage(SiteSection ...$sections): bool
    {
        return $this->hasLevel(AccessLevel::Manage, ...$sections);
    }

    /** Vrai si le niveau est atteint sur au moins une des sections. */
    public function hasLevel(AccessLevel $level, SiteSection ...$sections): bool
    {
        return array_any($sections, fn (SiteSection $section): bool => $this->accessLevel($section)->atLeast($level));
    }

    /** Vrai si des droits différents de ceux du rôle ont été posés. */
    public function hasCustomPermissions(): bool
    {
        return ! $this->isAdmin() && $this->permissions !== null && $this->permissions !== [];
    }

    /**
     * Niveau effectif de chaque section, pour le front (menu et boutons).
     *
     * @return array<string, string>
     */
    public function accessLevels(): array
    {
        $levels = [];
        foreach (SiteSection::cases() as $section) {
            $levels[$section->value] = $this->accessLevel($section)->value;
        }

        return $levels;
    }

    /**
     * Fonctions du membre (« Agent de visite »…), dans l'ordre de l'enum.
     *
     * @return list<StaffFunction>
     */
    public function staffFunctions(): array
    {
        $values = $this->functions ?? [];

        return array_values(array_filter(StaffFunction::cases(), fn (StaffFunction $function): bool => in_array($function->value, $values, true)));
    }

    public function hasRole(StaffRole ...$roles): bool
    {
        return in_array($this->role, $roles, true);
    }

    /**
     * Vrai si le rôle de l'utilisateur est au moins aussi privilégié que $role.
     */
    public function hasRoleAtLeast(StaffRole $role): bool
    {
        return $this->role->atLeast($role);
    }
}

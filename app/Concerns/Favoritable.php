<?php

declare(strict_types=1);

namespace App\Concerns;

use App\Models\Favorite;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\MorphMany;

/**
 * Modèle que chaque membre peut marquer en favori (étoile personnelle).
 *
 * @property-read bool|null $is_favorite Posé par `withFavoriteOf()` / `loadFavoriteOf()`.
 */
trait Favoritable
{
    /** Retire les étoiles posées sur le sujet quand il est supprimé (pas de clé étrangère sur une relation polymorphe). */
    protected static function bootFavoritable(): void
    {
        static::deleting(function (self $model): void {
            $model->favorites()->delete();
        });
    }

    /**
     * @return MorphMany<Favorite, $this>
     */
    public function favorites(): MorphMany
    {
        return $this->morphMany(Favorite::class, 'favoritable');
    }

    /**
     * Ajoute la colonne calculée `is_favorite` pour ce membre.
     *
     * @param  Builder<static>  $query
     */
    protected function scopeWithFavoriteOf(Builder $query, User $user): void
    {
        $query->withExists(['favorites as is_favorite' => fn (Builder $favorites) => $favorites->where('user_id', $user->id)]);
    }

    /** Charge `is_favorite` pour ce membre sur une instance déjà récupérée. */
    public function loadFavoriteOf(User $user): static
    {
        $this->loadExists(['favorites as is_favorite' => fn (Builder $favorites) => $favorites->where('user_id', $user->id)]);

        return $this;
    }

    public function isFavoriteOf(User $user): bool
    {
        return $this->favorites()->where('user_id', $user->id)->exists();
    }
}

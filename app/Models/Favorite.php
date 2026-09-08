<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * Étoile posée par un membre sur un agent ou une agence : favori personnel,
 * invisible pour les autres membres.
 *
 * @property int $id
 * @property int $user_id
 * @property string $favoritable_type
 * @property int $favoritable_id
 * @property CarbonInterface|null $created_at
 * @property CarbonInterface|null $updated_at
 * @property-read User $user
 * @property-read Model $favoritable
 */
#[Fillable(['user_id', 'favoritable_type', 'favoritable_id'])]
class Favorite extends Model
{
    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return MorphTo<Model, $this>
     */
    public function favoritable(): MorphTo
    {
        return $this->morphTo();
    }
}

<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\CarbonInterface;
use Database\Factories\ActivityFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Entrée du journal d'activité : une action du backoffice telle que diffusée
 * par DashboardUpdated (acteur, ressource, message à la 3e personne, payload).
 *
 * @property int $id
 * @property string $resource
 * @property string $message
 * @property int|null $user_id
 * @property int|null $lead_id
 * @property array<string, mixed>|null $payload
 * @property CarbonInterface $created_at
 */
#[Fillable(['resource', 'message', 'user_id', 'lead_id', 'payload', 'created_at'])]
class Activity extends Model
{
    /** @use HasFactory<ActivityFactory> */
    use HasFactory;

    public $timestamps = false;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'created_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * @return BelongsTo<Lead, $this>
     */
    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }
}

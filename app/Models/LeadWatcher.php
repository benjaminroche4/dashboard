<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Personne de suivi d'un dossier : un nom, une adresse e-mail, et le lien
 * qu'elle a avec le client. Elle reçoit une copie des e-mails du dossier.
 *
 * @property int $id
 * @property string $uuid
 * @property int $lead_id
 * @property string $name
 * @property string $email
 * @property string|null $phone
 * @property string|null $role
 * @property int|null $created_by
 * @property CarbonInterface|null $created_at
 * @property CarbonInterface|null $updated_at
 * @property-read Lead $lead
 */
#[Fillable(['lead_id', 'name', 'email', 'phone', 'role', 'created_by'])]
class LeadWatcher extends Model
{
    use HasUuids;

    /**
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
     * @return BelongsTo<Lead, $this>
     */
    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }
}

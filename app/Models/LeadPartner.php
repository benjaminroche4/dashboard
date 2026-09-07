<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\PartnerRole;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Intervention d'un partenaire sur le dossier d'un lead, avec son rôle.
 *
 * @property int $id
 * @property int $lead_id
 * @property int $partner_id
 * @property PartnerRole $role
 * @property string|null $note
 * @property int|null $created_by
 * @property CarbonInterface|null $created_at
 * @property CarbonInterface|null $updated_at
 * @property-read Lead $lead
 * @property-read Partner $partner
 * @property-read User|null $creator
 */
#[Fillable(['lead_id', 'partner_id', 'role', 'note', 'created_by'])]
class LeadPartner extends Model
{
    protected $table = 'lead_partner';

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['role' => PartnerRole::class];
    }

    /**
     * @return BelongsTo<Lead, $this>
     */
    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    /**
     * @return BelongsTo<Partner, $this>
     */
    public function partner(): BelongsTo
    {
        return $this->belongsTo(Partner::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

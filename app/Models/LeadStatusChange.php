<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\LeadStatus;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $lead_id
 * @property LeadStatus|null $from_status
 * @property LeadStatus $to_status
 * @property int|null $changed_by
 * @property CarbonInterface $created_at
 */
#[Fillable(['lead_id', 'from_status', 'to_status', 'changed_by', 'created_at'])]
class LeadStatusChange extends Model
{
    public $timestamps = false;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'from_status' => LeadStatus::class,
            'to_status' => LeadStatus::class,
            'created_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}

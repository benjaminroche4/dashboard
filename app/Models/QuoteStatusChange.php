<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\QuoteStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $quote_id
 * @property QuoteStatus|null $from_status
 * @property QuoteStatus $to_status
 * @property int|null $changed_by
 * @property string|null $note
 * @property Carbon $created_at
 */
#[Fillable(['from_status', 'to_status', 'changed_by', 'note', 'created_at'])]
class QuoteStatusChange extends Model
{
    public $timestamps = false;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'from_status' => QuoteStatus::class,
            'to_status' => QuoteStatus::class,
            'created_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Quote, $this>
     */
    public function quote(): BelongsTo
    {
        return $this->belongsTo(Quote::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}

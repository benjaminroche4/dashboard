<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\Currency;
use App\Enums\LeadSource;
use App\Enums\LeadStatus;
use App\Enums\Offer;
use Carbon\CarbonInterface;
use Database\Factories\LeadFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property string $first_name
 * @property string $last_name
 * @property string|null $email
 * @property string|null $phone
 * @property Offer|null $offer
 * @property CarbonInterface|null $arrival_at
 * @property int|null $budget_cents
 * @property Currency $currency
 * @property string|null $origin_city
 * @property LeadSource $source
 * @property string|null $message
 * @property int|null $score
 * @property LeadStatus $status
 * @property CarbonInterface|null $last_contacted_at
 * @property int|null $created_by
 * @property CarbonInterface|null $created_at
 * @property CarbonInterface|null $updated_at
 */
#[Fillable([
    'first_name', 'last_name', 'email', 'phone', 'offer', 'arrival_at', 'budget_cents', 'currency',
    'origin_city', 'source', 'message', 'score', 'status', 'last_contacted_at', 'created_by',
])]
class Lead extends Model
{
    /** @use HasFactory<LeadFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'offer' => Offer::class,
            'arrival_at' => 'date',
            'budget_cents' => 'integer',
            'score' => 'integer',
            'currency' => Currency::class,
            'source' => LeadSource::class,
            'status' => LeadStatus::class,
            'last_contacted_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function fullName(): string
    {
        return trim("{$this->first_name} {$this->last_name}");
    }
}

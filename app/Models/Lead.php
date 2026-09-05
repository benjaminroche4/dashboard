<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\Currency;
use App\Enums\Furnished;
use App\Enums\GuarantorType;
use App\Enums\LeadDuration;
use App\Enums\LeadLanguage;
use App\Enums\PropertyType;
use App\Enums\RecontactChannel;
use App\Enums\LeadSource;
use App\Enums\LeadStatus;
use App\Enums\Offer;
use Carbon\CarbonInterface;
use Database\Factories\LeadFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\AsEnumCollection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property string $first_name
 * @property string $last_name
 * @property string|null $email
 * @property string|null $phone
 * @property string|null $company
 * @property LeadLanguage $language
 * @property Offer|null $offer
 * @property CarbonInterface|null $arrival_at
 * @property int|null $budget_cents
 * @property Currency $currency
 * @property string|null $origin_city
 * @property LeadSource $source
 * @property string|null $source_note
 * @property list<int>|null $districts
 * @property \Illuminate\Support\Collection<int, PropertyType>|null $property_types
 * @property LeadDuration|null $duration
 * @property GuarantorType|null $guarantor
 * @property Furnished|null $furnished
 * @property string|null $message
 * @property int|null $score
 * @property RecontactChannel|null $recontact_channel
 * @property CarbonInterface|null $recontact_at
 * @property string|null $qualification_note
 * @property LeadStatus $status
 * @property int $position
 * @property CarbonInterface|null $last_contacted_at
 * @property int|null $created_by
 * @property int|null $assigned_to
 * @property CarbonInterface|null $created_at
 * @property CarbonInterface|null $updated_at
 */
#[Fillable([
    'first_name', 'last_name', 'email', 'phone', 'company', 'language', 'offer', 'arrival_at', 'budget_cents', 'currency',
    'origin_city', 'districts', 'property_types', 'duration', 'guarantor', 'furnished', 'source', 'source_note', 'message',
    'score', 'recontact_channel', 'recontact_at', 'qualification_note', 'status', 'position', 'last_contacted_at', 'created_by', 'assigned_to',
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
            'language' => LeadLanguage::class,
            'districts' => 'array',
            'property_types' => AsEnumCollection::of(PropertyType::class),
            'duration' => LeadDuration::class,
            'guarantor' => GuarantorType::class,
            'furnished' => Furnished::class,
            'recontact_channel' => RecontactChannel::class,
            'recontact_at' => 'date',
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

    /**
     * @return BelongsTo<User, $this>
     */
    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    /**
     * @return HasMany<LeadStatusChange, $this>
     */
    public function statusChanges(): HasMany
    {
        return $this->hasMany(LeadStatusChange::class)->oldest()->orderBy('id');
    }

    /**
     * @return HasMany<LeadNote, $this>
     */
    public function notes(): HasMany
    {
        return $this->hasMany(LeadNote::class)->latest()->orderByDesc('id');
    }

    public function fullName(): string
    {
        return trim("{$this->first_name} {$this->last_name}");
    }
}

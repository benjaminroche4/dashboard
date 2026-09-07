<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\Currency;
use App\Enums\Furnished;
use App\Enums\GuarantorType;
use App\Enums\LeadDuration;
use App\Enums\LeadLanguage;
use App\Enums\LeadLossReason;
use App\Enums\LeadSource;
use App\Enums\LeadStatus;
use App\Enums\Offer;
use App\Enums\PropertyType;
use App\Enums\RecontactChannel;
use App\Enums\WebsiteHelpType;
use Carbon\CarbonInterface;
use Database\Factories\LeadFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\AsEnumCollection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Collection;

/**
 * @property int $id
 * @property string $uuid
 * @property string|null $reference
 * @property string|null $external_reference
 * @property LeadLossReason|null $loss_reason
 * @property string|null $loss_note
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
 * @property WebsiteHelpType|null $help_type
 * @property list<int>|null $districts
 * @property Collection<int, PropertyType>|null $property_types
 * @property LeadDuration|null $duration
 * @property Collection<int, GuarantorType>|null $guarantors
 * @property Furnished|null $furnished
 * @property string|null $message
 * @property int|null $score
 * @property RecontactChannel|null $recontact_channel
 * @property CarbonInterface|null $recontact_at
 * @property CarbonInterface|null $visio_at
 * @property string|null $visio_event_id
 * @property string|null $visio_meet_link
 * @property string|null $qualification_note
 * @property LeadStatus $status
 * @property int $position
 * @property CarbonInterface|null $last_contacted_at
 * @property CarbonInterface|null $first_contact_alerted_at
 * @property int|null $created_by
 * @property int|null $assigned_to
 * @property int|null $agent_id
 * @property-read Agent|null $agent
 * @property-read \Illuminate\Database\Eloquent\Collection<int, LeadPartner> $partnerLinks
 * @property CarbonInterface|null $created_at
 * @property CarbonInterface|null $updated_at
 */
#[Fillable([
    'reference', 'external_reference',
    'first_name', 'last_name', 'email', 'phone', 'company', 'language', 'offer', 'arrival_at', 'budget_cents', 'currency',
    'origin_city', 'districts', 'property_types', 'duration', 'guarantors', 'furnished', 'source', 'source_note', 'help_type', 'message',
    'score', 'recontact_channel', 'recontact_at', 'visio_at', 'visio_event_id', 'visio_meet_link', 'qualification_note', 'status', 'loss_reason', 'loss_note', 'position', 'last_contacted_at', 'first_contact_alerted_at', 'created_by', 'assigned_to',
    'agent_id',
])]
class Lead extends Model
{
    /** @use HasFactory<LeadFactory> */
    use HasFactory;

    use HasUuids;

    /**
     * L'UUID est l'identifiant public (URL) ; l'identifiant numérique reste la clé primaire.
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
            'guarantors' => AsEnumCollection::of(GuarantorType::class),
            'furnished' => Furnished::class,
            'recontact_channel' => RecontactChannel::class,
            'recontact_at' => 'date',
            'visio_at' => 'datetime',
            'currency' => Currency::class,
            'source' => LeadSource::class,
            'help_type' => WebsiteHelpType::class,
            'status' => LeadStatus::class,
            'loss_reason' => LeadLossReason::class,
            'last_contacted_at' => 'datetime',
            'first_contact_alerted_at' => 'datetime',
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
     * Factures rattachées à ce lead.
     *
     * @return HasMany<Invoice, $this>
     */
    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class)->latest('issued_at')->orderByDesc('id');
    }

    /**
     * Listes de documents générées pour ce lead.
     *
     * @return HasMany<DocumentRequest, $this>
     */
    public function documentRequests(): HasMany
    {
        return $this->hasMany(DocumentRequest::class)->latest()->orderByDesc('id');
    }

    /**
     * Devis rattachés au lead, les plus récents en premier.
     *
     * @return HasMany<Quote, $this>
     */
    public function quotes(): HasMany
    {
        return $this->hasMany(Quote::class)->latest('issued_at')->orderByDesc('id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    /**
     * Agent immobilier en contact sur ce dossier.
     *
     * @return BelongsTo<Agent, $this>
     */
    public function agent(): BelongsTo
    {
        return $this->belongsTo(Agent::class);
    }

    /**
     * Partenaires intervenant sur ce dossier, avec leur rôle.
     *
     * @return HasMany<LeadPartner, $this>
     */
    public function partnerLinks(): HasMany
    {
        return $this->hasMany(LeadPartner::class)->orderBy('id');
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

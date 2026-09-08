<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\VisitStatus;
use Carbon\CarbonInterface;
use Database\Factories\VisitFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Visite d'un bien par un client, à une date donnée.
 *
 * @property int $id
 * @property string $uuid
 * @property int $lead_id
 * @property int $property_id
 * @property int|null $agent_id
 * @property int|null $assigned_to
 * @property CarbonInterface $scheduled_at
 * @property VisitStatus $status
 * @property string|null $notes
 * @property string|null $report
 * @property CarbonInterface|null $report_submitted_at
 * @property int|null $report_submitted_by
 * @property CarbonInterface|null $report_reminded_at
 * @property int|null $created_by
 * @property CarbonInterface|null $created_at
 * @property CarbonInterface|null $updated_at
 * @property-read Lead $lead
 * @property-read Property $property
 * @property-read Agent|null $agent
 * @property-read User|null $assignee
 * @property-read User|null $creator
 * @property-read User|null $reportAuthor
 */
#[Fillable(['lead_id', 'property_id', 'agent_id', 'assigned_to', 'scheduled_at', 'status', 'notes', 'report', 'report_submitted_at', 'report_submitted_by', 'report_reminded_at', 'created_by'])]
class Visit extends Model
{
    /** @use HasFactory<VisitFactory> */
    use HasFactory;

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
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'scheduled_at' => 'datetime',
            'status' => VisitStatus::class,
            'report_submitted_at' => 'datetime',
            'report_reminded_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Lead, $this>
     */
    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    /**
     * @return BelongsTo<Property, $this>
     */
    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }

    /**
     * @return BelongsTo<Agent, $this>
     */
    public function agent(): BelongsTo
    {
        return $this->belongsTo(Agent::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function reportAuthor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'report_submitted_by');
    }

    /** Un compte rendu est attendu : visite passée, non annulée, sans compte rendu. */
    public function reportDue(): bool
    {
        return $this->report === null
            && $this->status !== VisitStatus::Cancelled
            && $this->scheduled_at->isPast();
    }

    /**
     * Visites passées et non annulées dont le compte rendu manque.
     *
     * @param  Builder<Visit>  $query
     */
    protected function scopeAwaitingReport(Builder $query): void
    {
        $query->whereNull('report')
            ->where('status', '!=', VisitStatus::Cancelled)
            ->where('scheduled_at', '<', now());
    }
}

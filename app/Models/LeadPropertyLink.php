<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\PropertyApplicationStatus;
use App\Enums\VisitStatus;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\Pivot;
use Illuminate\Database\Query\Builder as QueryBuilder;

/**
 * Lien entre un dossier client et un bien qu'on lui propose (`lead_property`).
 * Après la visite, il porte la suite donnée : le client se positionne ou non,
 * puis sa candidature aboutit ou non.
 *
 * @property int|null $created_by
 * @property PropertyApplicationStatus $status
 * @property CarbonInterface|null $status_at
 * @property CarbonInterface|null $decision_reminded_at
 */
class LeadPropertyLink extends Pivot
{
    protected $table = 'lead_property';

    public $incrementing = true;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => PropertyApplicationStatus::class,
            'status_at' => 'datetime',
            'decision_reminded_at' => 'datetime',
        ];
    }

    /**
     * Biens visités qu'un client laisse en attente : la visite est faite depuis
     * plus de `$hours`, le client n'a pas tranché, et le dernier rappel aux
     * personnes de suivi date d'au moins `$hours` (ou n'a jamais eu lieu).
     *
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function awaitingDecision(Builder $query, int $hours): void
    {
        $since = now()->subHours($hours);

        $query->where('status', PropertyApplicationStatus::Pending)
            ->where(fn (Builder $pending): Builder => $pending
                ->whereNull('decision_reminded_at')
                ->orWhere('decision_reminded_at', '<=', $since))
            // Il faut une visite effectuée sur ce bien pour ce dossier : sans
            // visite, il n'y a rien à décider.
            ->whereExists(fn (QueryBuilder $visits) => $visits
                ->from('visits')
                ->whereColumn('visits.lead_id', 'lead_property.lead_id')
                ->whereColumn('visits.property_id', 'lead_property.property_id')
                ->where('visits.status', VisitStatus::Done->value)
                ->where('visits.scheduled_at', '<=', $since));
    }
}

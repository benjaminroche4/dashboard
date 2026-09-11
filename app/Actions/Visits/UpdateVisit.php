<?php

declare(strict_types=1);

namespace App\Actions\Visits;

use App\Data\VisitUpdateData;
use App\Enums\VisitMode;
use App\Enums\VisitStatus;
use App\Events\DashboardUpdated;
use App\Models\Visit;
use Carbon\CarbonImmutable;

/**
 * Change l'avancement d'une visite, son créneau, le bien visité, l'agent, le
 * membre qui la réalise ou ses notes.
 */
final class UpdateVisit
{
    public function handle(Visit $visit, VisitUpdateData $data): Visit
    {
        if ($data->status instanceof VisitStatus) {
            $visit->status = $data->status;
        }

        if ($data->mode instanceof VisitMode) {
            $visit->mode = $data->mode;
        }

        if ($data->scheduledAt instanceof CarbonImmutable) {
            $visit->scheduled_at = $data->scheduledAt;
        }

        if ($data->notes !== null) {
            $visit->notes = trim($data->notes) === '' ? null : trim($data->notes);
        }

        if ($data->propertyId !== null) {
            $visit->property_id = $data->propertyId;
        }

        if ($data->agentId !== null || $data->clearAgent) {
            $visit->agent_id = $data->agentId;
        }

        if ($data->assignedTo !== null || $data->clearAssignee) {
            $visit->assigned_to = $data->assignedTo;
        }

        $visit->save();
        $visit->load(['lead', 'property']);

        event(new DashboardUpdated('visits', ['id' => $visit->id], "a mis à jour la visite de {$visit->lead->fullName()} ({$visit->status->label()})"));

        return $visit;
    }
}

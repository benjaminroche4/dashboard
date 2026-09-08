<?php

declare(strict_types=1);

namespace App\Actions\Visits;

use App\Enums\VisitStatus;
use App\Events\DashboardUpdated;
use App\Models\Visit;
use Carbon\CarbonImmutable;

/**
 * Change l'avancement d'une visite, sa date ou ses notes.
 */
final class UpdateVisit
{
    public function handle(Visit $visit, ?VisitStatus $status, ?CarbonImmutable $scheduledAt, ?string $notes): Visit
    {
        if ($status instanceof VisitStatus) {
            $visit->status = $status;
        }

        if ($scheduledAt instanceof CarbonImmutable) {
            $visit->scheduled_at = $scheduledAt;
        }

        if ($notes !== null) {
            $visit->notes = trim($notes) === '' ? null : trim($notes);
        }

        $visit->save();
        $visit->load(['lead', 'property']);

        event(new DashboardUpdated('visits', ['id' => $visit->id], "a mis à jour la visite de {$visit->lead->fullName()} ({$visit->status->label()})"));

        return $visit;
    }
}

<?php

declare(strict_types=1);

namespace App\Actions\Visits;

use App\Enums\VisitStatus;
use App\Events\DashboardUpdated;
use App\Models\User;
use App\Models\Visit;

/**
 * Enregistre le compte rendu d'une visite : la visite passe en « Effectuée »
 * si elle était planifiée, le compte rendu est recopié en note du client.
 */
final class SubmitVisitReport
{
    public function handle(Visit $visit, string $report, ?User $by = null): Visit
    {
        $visit->report = trim($report);
        $visit->report_submitted_at = now();
        $visit->report_submitted_by = $by?->id;

        if ($visit->status === VisitStatus::Planned) {
            $visit->status = VisitStatus::Done;
        }

        $visit->save();
        $visit->load(['lead', 'property']);

        $when = $visit->scheduled_at->translatedFormat('j F Y');
        $visit->lead->notes()->create([
            'body' => "Compte rendu de la visite du {$when} ({$visit->property->label()}) : {$visit->report}",
            'user_id' => $by?->id,
        ]);

        event(new DashboardUpdated('visits', ['id' => $visit->id], "a rédigé le compte rendu de la visite de {$visit->lead->fullName()} : {$visit->property->label()}", $by));

        return $visit;
    }
}

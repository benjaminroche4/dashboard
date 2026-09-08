<?php

declare(strict_types=1);

namespace App\Actions\Visits;

use App\Events\DashboardUpdated;
use App\Mail\VisitReportDue;
use App\Models\User;
use App\Models\Visit;
use Illuminate\Support\Facades\Mail;

/**
 * Après chaque visite : le responsable reçoit un e-mail lui rappelant de
 * rédiger le compte rendu, plus un toast temps réel s'il est connecté.
 * Une visite n'est rappelée qu'une fois (`report_reminded_at`).
 */
final class SendVisitReportReminders
{
    /**
     * @return int Nombre de rappels envoyés
     */
    public function handle(): int
    {
        $visits = Visit::query()
            ->with(['lead', 'property', 'assignee'])
            ->awaitingReport()
            ->whereNull('report_reminded_at')
            ->whereNotNull('assigned_to')
            // On laisse la visite se terminer avant de relancer.
            ->where('scheduled_at', '<=', now()->subMinutes((int) config('company.visit_report.delay_minutes')))
            ->oldest('scheduled_at')
            ->get();

        $sent = 0;

        foreach ($visits as $visit) {
            $assignee = $visit->assignee;

            if (! $assignee instanceof User) {
                continue;
            }

            Mail::to($assignee->email, $assignee->name)->send(new VisitReportDue($visit));

            $visit->forceFill(['report_reminded_at' => now()])->save();

            event(new DashboardUpdated(
                'visits',
                ['id' => $visit->id, 'mentions' => [$assignee->id]],
                "vous rappelle le compte rendu de la visite de {$visit->lead->fullName()} : {$visit->property->label()}",
            ));
            $sent++;
        }

        return $sent;
    }
}

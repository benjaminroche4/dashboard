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
 * rédiger le compte rendu, avec les personnes de suivi du dossier en copie,
 * plus un toast temps réel pour tout ce monde.
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
            ->with(['lead.assignee', 'lead.coAssignee', 'property', 'assignee'])
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

            // Les personnes de suivi du dossier (deux au plus) sont en copie :
            // le compte rendu manquant les concerne autant que celui qui a visité.
            $followers = array_values(array_filter(
                $visit->lead->followers(),
                fn (User $follower): bool => $follower->id !== $assignee->id,
            ));

            Mail::to($assignee->email, $assignee->name)
                ->cc(array_map(fn (User $follower): string => $follower->email, $followers))
                ->send(new VisitReportDue($visit));

            $visit->forceFill(['report_reminded_at' => now()])->save();

            $mentions = [$assignee->id, ...array_map(fn (User $follower): int => $follower->id, $followers)];
            event(new DashboardUpdated(
                'visits',
                ['id' => $visit->id, 'mentions' => $mentions],
                "vous rappelle le compte rendu de la visite de {$visit->lead->fullName()} : {$visit->property->label()}",
            ));
            $sent++;
        }

        return $sent;
    }
}

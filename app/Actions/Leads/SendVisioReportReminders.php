<?php

declare(strict_types=1);

namespace App\Actions\Leads;

use App\Events\DashboardUpdated;
use App\Mail\VisioReportDue;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Support\Facades\Mail;

/**
 * Après chaque appel vidéo : le conseiller responsable du lead reçoit un e-mail
 * lui rappelant de rédiger le compte rendu, plus un toast temps réel.
 * Un créneau n'est rappelé qu'une fois (`visio_report_reminded_at`).
 */
final class SendVisioReportReminders
{
    /**
     * @return int Nombre de rappels envoyés
     */
    public function handle(): int
    {
        $leads = Lead::query()
            ->with('assignee')
            ->awaitingVisioReport()
            ->whereNull('visio_report_reminded_at')
            ->whereNotNull('assigned_to')
            // On laisse l'appel se terminer avant de relancer.
            ->where('visio_at', '<=', now()->subMinutes((int) config('company.visit_report.delay_minutes')))
            ->oldest('visio_at')
            ->get();

        $sent = 0;

        foreach ($leads as $lead) {
            $assignee = $lead->assignee;

            if (! $assignee instanceof User) {
                continue;
            }

            Mail::to($assignee->email, $assignee->name)->send(new VisioReportDue($lead));

            $lead->forceFill(['visio_report_reminded_at' => now()])->save();

            event(new DashboardUpdated(
                'leads',
                ['id' => $lead->id, 'mentions' => [$assignee->id]],
                "vous rappelle le compte rendu de l'appel vidéo avec {$lead->fullName()}",
            ));
            $sent++;
        }

        return $sent;
    }
}

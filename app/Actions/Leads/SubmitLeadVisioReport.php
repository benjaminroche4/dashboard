<?php

declare(strict_types=1);

namespace App\Actions\Leads;

use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\User;

/**
 * Enregistre le compte rendu de l'appel vidéo : recopié en note du lead,
 * qui compte comme un contact.
 */
final class SubmitLeadVisioReport
{
    public function handle(Lead $lead, string $report, ?User $by = null): Lead
    {
        $lead->forceFill([
            'visio_report' => trim($report),
            'visio_report_submitted_at' => now(),
            'visio_report_submitted_by' => $by?->id,
            'last_contacted_at' => now(),
        ])->save();

        $when = $lead->visio_at?->timezone('Europe/Paris')->translatedFormat('j F Y \à H\hi') ?? 'date inconnue';
        $lead->notes()->create([
            'body' => "Compte rendu de l'appel vidéo du {$when} : {$lead->visio_report}",
            'user_id' => $by?->id,
        ]);

        event(new DashboardUpdated('leads', ['id' => $lead->id], "a rédigé le compte rendu de l'appel vidéo avec {$lead->fullName()}", $by));

        return $lead;
    }
}

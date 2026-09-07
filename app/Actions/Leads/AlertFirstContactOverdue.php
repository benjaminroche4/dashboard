<?php

declare(strict_types=1);

namespace App\Actions\Leads;

use App\Enums\LeadStatus;
use App\Events\DashboardUpdated;
use App\Mail\FirstContactOverdue;
use App\Models\Lead;
use Illuminate\Support\Facades\Mail;

/**
 * Chaque minute : tout lead « À traiter » créé depuis plus de 30 minutes et jamais
 * contacté déclenche une alerte e-mail à l'adresse de contact de l'équipe, une seule fois.
 */
final class AlertFirstContactOverdue
{
    /**
     * @return int Nombre de leads signalés
     */
    public function handle(): int
    {
        $minutes = max(1, (int) config('company.first_contact.minutes', 30));
        $recipient = (string) config('company.first_contact.alert_email', '');

        if ($recipient === '') {
            return 0;
        }

        $leads = Lead::query()
            ->with('assignee')
            ->where('status', LeadStatus::Todo)
            ->whereNull('last_contacted_at')
            ->whereNull('first_contact_alerted_at')
            ->where('created_at', '<=', now()->subMinutes($minutes))
            ->oldest()
            ->get();

        foreach ($leads as $lead) {
            Mail::to($recipient)->send(new FirstContactOverdue($lead, $minutes));

            $lead->forceFill(['first_contact_alerted_at' => now()])->save();

            $mentions = $lead->assigned_to === null ? [] : [$lead->assigned_to];
            event(new DashboardUpdated(
                'leads',
                ['id' => $lead->id, 'mentions' => $mentions],
                "Lead {$lead->fullName()} sans contact depuis {$minutes} min : alerte envoyée à {$recipient}",
            ));
        }

        return $leads->count();
    }
}

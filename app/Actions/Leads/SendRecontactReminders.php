<?php

declare(strict_types=1);

namespace App\Actions\Leads;

use App\Enums\LeadStatus;
use App\Events\DashboardUpdated;
use App\Mail\RecontactsDue;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Mail;

/**
 * Chaque matin : à chaque responsable, la liste de ses recontacts du jour et
 * en retard, par e-mail et par un toast temps réel s'il est connecté.
 */
final class SendRecontactReminders
{
    /**
     * @return int Nombre de responsables prévenus
     */
    public function handle(): int
    {
        /** @var Collection<int, Collection<int, Lead>> $byAssignee */
        $byAssignee = Lead::query()
            ->with('assignee')
            ->whereNotNull('assigned_to')
            ->whereNotNull('recontact_at')
            ->whereDate('recontact_at', '<=', today())
            ->whereNotIn('status', [LeadStatus::Converted, LeadStatus::Archived])
            ->oldest('recontact_at')
            ->get()
            ->groupBy('assigned_to');

        $notified = 0;

        foreach ($byAssignee as $leads) {
            $assignee = $leads->first()?->assignee;

            if (! $assignee instanceof User) {
                continue;
            }

            $overdue = $leads->filter(fn (Lead $lead): bool => $lead->recontact_at?->isBefore(today()) ?? false);
            Mail::to($assignee->email, $assignee->name)->send(new RecontactsDue($assignee, $leads->values()));

            $count = $leads->count();
            $message = $overdue->isEmpty()
                ? "vous rappelle {$count} recontact(s) prévu(s) aujourd'hui"
                : "vous rappelle {$count} recontact(s), dont {$overdue->count()} en retard";
            event(new DashboardUpdated('leads', ['mentions' => [$assignee->id], 'ids' => $leads->pluck('id')->all()], $message));
            $notified++;
        }

        return $notified;
    }
}

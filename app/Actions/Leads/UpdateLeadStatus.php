<?php

declare(strict_types=1);

namespace App\Actions\Leads;

use App\Enums\LeadStatus;
use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Déplace un lead dans le kanban : autre colonne et/ou autre position,
 * en journalisant tout changement de statut.
 */
final class UpdateLeadStatus
{
    public function handle(Lead $lead, LeadStatus $status, ?int $position = null, ?User $by = null): Lead
    {
        return DB::transaction(function () use ($lead, $status, $position, $by): Lead {
            $previous = $lead->status;
            $changed = $previous !== $status;

            // Retire le lead de son ancienne place.
            Lead::query()
                ->where('status', $previous)
                ->where('position', '>', $lead->position)
                ->whereKeyNot($lead->id)
                ->decrement('position');

            $target = $position ?? (
                $changed
                    ? 0
                    : (int) Lead::query()->where('status', $status)->whereKeyNot($lead->id)->max('position') + 1
            );

            // Libère la place visée.
            Lead::query()
                ->where('status', $status)
                ->where('position', '>=', $target)
                ->whereKeyNot($lead->id)
                ->increment('position');

            $lead->status = $status;
            $lead->position = $target;

            if ($changed && $status !== LeadStatus::Todo) {
                $lead->last_contacted_at = now();
            }

            $lead->save();

            if ($changed) {
                $lead->statusChanges()->create(['from_status' => $previous, 'to_status' => $status, 'changed_by' => $by?->id, 'created_at' => now()]);
                event(new DashboardUpdated('leads', ['id' => $lead->id], "a passé le lead {$lead->fullName()} en « {$status->label()} »"));
            }

            return $lead;
        });
    }
}

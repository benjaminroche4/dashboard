<?php

declare(strict_types=1);

namespace App\Actions\Leads;

use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\User;

/**
 * Attribue un lead à un membre du staff (ou le libère).
 */
final class AssignLead
{
    public function handle(Lead $lead, ?User $assignee): Lead
    {
        if ($lead->assigned_to === $assignee?->id) {
            return $lead;
        }

        $lead->assigned_to = $assignee?->id;
        $lead->save();

        $message = $assignee instanceof User
            ? "a attribué le lead {$lead->fullName()} à {$assignee->name}"
            : "a libéré le lead {$lead->fullName()}";
        event(new DashboardUpdated('leads', ['id' => $lead->id], $message));

        return $lead;
    }
}

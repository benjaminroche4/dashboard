<?php

declare(strict_types=1);

namespace App\Actions\Clients;

use App\Enums\ClientPriority;
use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\User;

/**
 * Change la priorité d'un dossier client. Sans effet si elle est déjà celle-là.
 */
final class SetClientPriority
{
    public function handle(Lead $lead, ClientPriority $priority, ?User $by = null): Lead
    {
        if ($lead->priority === $priority) {
            return $lead;
        }

        $lead->priority = $priority;
        $lead->save();

        $lead->notes()->create(['body' => "Priorité du dossier : {$priority->label()}.", 'user_id' => $by?->id]);
        event(new DashboardUpdated('clients', ['id' => $lead->id, 'priority' => $priority->value], "a passé le dossier {$lead->fullName()} en priorité {$priority->label()}", $by));

        return $lead;
    }
}

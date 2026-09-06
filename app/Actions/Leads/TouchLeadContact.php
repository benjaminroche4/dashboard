<?php

declare(strict_types=1);

namespace App\Actions\Leads;

use App\Events\DashboardUpdated;
use App\Models\Lead;

/**
 * Marque le lead comme contacté à l'instant (appel, e-mail hors outil…).
 */
final class TouchLeadContact
{
    public function handle(Lead $lead): Lead
    {
        $lead->forceFill(['last_contacted_at' => now()])->save();

        event(new DashboardUpdated('leads', ['id' => $lead->id], "a noté un contact avec le lead {$lead->fullName()}"));

        return $lead;
    }
}

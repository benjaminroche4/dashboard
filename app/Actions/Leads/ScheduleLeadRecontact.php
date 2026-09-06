<?php

declare(strict_types=1);

namespace App\Actions\Leads;

use App\Enums\RecontactChannel;
use App\Events\DashboardUpdated;
use App\Models\Lead;
use Carbon\CarbonInterface;

/**
 * Planifie (ou efface) le prochain recontact d'un lead : canal et date.
 */
final class ScheduleLeadRecontact
{
    public function handle(Lead $lead, ?CarbonInterface $at, ?RecontactChannel $channel): Lead
    {
        $lead->recontact_at = $at;
        $lead->recontact_channel = $channel;
        $lead->save();

        $message = $at instanceof CarbonInterface
            ? "a planifié un recontact du lead {$lead->fullName()} le {$at->format('d/m/Y')}"
            : "a effacé le recontact du lead {$lead->fullName()}";
        event(new DashboardUpdated('leads', ['id' => $lead->id], $message));

        return $lead;
    }
}

<?php

declare(strict_types=1);

namespace App\Actions\Leads;

use App\Events\DashboardUpdated;
use App\Models\LeadNote;

/**
 * Corrige le texte d'une note interne.
 */
final class UpdateLeadNote
{
    public function handle(LeadNote $note, string $body): LeadNote
    {
        $note->body = $body;
        $note->save();

        $lead = $note->lead;
        event(new DashboardUpdated('leads', ['id' => $lead->id], "a corrigé une note sur le lead {$lead->fullName()}"));

        return $note;
    }
}

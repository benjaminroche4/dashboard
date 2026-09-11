<?php

declare(strict_types=1);

namespace App\Actions\Documents;

use App\Events\DashboardUpdated;
use App\Models\DocumentRequest;
use App\Models\Lead;
use App\Models\User;

/**
 * Rattache une liste de documents à un lead (ou la détache avec null). Une
 * liste n'a qu'un lead, un lead peut avoir plusieurs listes.
 */
final class LinkDocumentRequestToLead
{
    public function handle(DocumentRequest $request, ?Lead $lead, ?User $by = null): DocumentRequest
    {
        $previous = $request->lead;
        $request->lead()->associate($lead);
        $request->save();

        $name = $request->fullName();

        if ($lead instanceof Lead) {
            $lead->notes()->create(['body' => "Liste de documents de {$name} rattachée à ce lead.", 'user_id' => $by?->id]);
            event(new DashboardUpdated('documents', ['id' => $request->id, 'lead_id' => $lead->id], "a rattaché la liste de documents de {$name} au lead {$lead->fullName()}", $by));
        } elseif ($previous !== null) {
            $previous->notes()->create(['body' => "Liste de documents de {$name} détachée de ce lead.", 'user_id' => $by?->id]);
            event(new DashboardUpdated('documents', ['id' => $request->id, 'lead_id' => null], "a détaché la liste de documents de {$name} du lead {$previous->fullName()}", $by));
        }

        return $request;
    }
}

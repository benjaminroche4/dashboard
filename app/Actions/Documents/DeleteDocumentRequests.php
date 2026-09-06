<?php

declare(strict_types=1);

namespace App\Actions\Documents;

use App\Events\DashboardUpdated;
use App\Models\DocumentRequest;
use Illuminate\Support\Collection;

/**
 * Supprime plusieurs demandes de pièces (admins).
 */
final class DeleteDocumentRequests
{
    /**
     * @param  Collection<int, DocumentRequest>  $requests
     * @return int Nombre de demandes supprimées.
     */
    public function handle(Collection $requests): int
    {
        $count = 0;

        foreach ($requests as $request) {
            $name = $request->fullName();
            $request->delete();
            $count++;

            event(new DashboardUpdated('documents', ['id' => $request->id], "a supprimé la demande de pièces de {$name}"));
        }

        return $count;
    }
}

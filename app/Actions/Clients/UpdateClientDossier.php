<?php

declare(strict_types=1);

namespace App\Actions\Clients;

use App\Data\ClientDossierData;
use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\User;

/**
 * Modifie un dossier client depuis sa propre page, sans passer par la fiche
 * lead : seules les colonnes du dossier (contact et projet de logement) sont
 * écrites. Le statut, la qualification, la source et le suivi restent en
 * place — un client est un lead converti, mais on ne le requalifie pas en le
 * modifiant.
 */
final class UpdateClientDossier
{
    public function handle(Lead $lead, ClientDossierData $data, ?User $by = null): Lead
    {
        $lead->fill($data->toArray());

        // Rien n'a bougé : ni écriture, ni note, ni toast chez les autres.
        if ($lead->isClean()) {
            return $lead;
        }

        $lead->save();

        $lead->notes()->create([
            'body' => 'Dossier client modifié.',
            'user_id' => $by?->id,
        ]);

        event(new DashboardUpdated(
            'clients',
            ['id' => $lead->id, 'mentions' => array_map(fn (User $member): int => $member->id, $lead->followers())],
            "a modifié le dossier client {$lead->fullName()}",
            $by,
        ));

        return $lead;
    }
}

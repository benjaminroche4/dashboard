<?php

declare(strict_types=1);

namespace App\Actions\Clients;

use App\Actions\Leads\CreateLead;
use App\Actions\Leads\UpdateLeadStatus;
use App\Data\LeadData;
use App\Enums\LeadStatus;
use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Ouvre un dossier client **sans passer par un lead** : un client qui arrive
 * par une recommandation ou qui a déjà signé n'a jamais traîné dans la
 * Converting Machine.
 *
 * Un client reste un lead converti (pas de table dédiée) : on passe donc par
 * `CreateLead` puis `UpdateLeadStatus`, pour garder la référence LD-XXXX,
 * l'historique de statut — dont dépend le « client depuis » de la liste — et
 * la mécanique du kanban.
 */
final readonly class CreateClientDossier
{
    public function __construct(
        private CreateLead $createLead,
        private UpdateLeadStatus $updateLeadStatus,
    ) {}

    public function handle(LeadData $data, ?User $by = null): Lead
    {
        return DB::transaction(function () use ($data, $by): Lead {
            $lead = $this->createLead->handle($data, $by);
            $lead = $this->updateLeadStatus->handle($lead, LeadStatus::Converted, null, $by);

            $lead->notes()->create([
                'body' => 'Dossier client ouvert directement, sans passer par un lead.',
                'user_id' => $by?->id,
            ]);

            event(new DashboardUpdated('clients', ['id' => $lead->id], "a ouvert le dossier client {$lead->fullName()}"));

            return $lead;
        });
    }
}

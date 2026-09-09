<?php

declare(strict_types=1);

namespace App\Actions\Dashboard;

use App\Enums\LeadSegment;
use App\Enums\LeadStatus;
use App\Enums\SiteSection;
use App\Http\Controllers\Leads\LeadController;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;

/**
 * « Mon travail » du tableau de bord : les leads locataires, les leads
 * propriétaires et les dossiers clients attribués au membre connecté, chaque
 * bloc n'étant rempli que si sa section lui est ouverte en lecture.
 */
final class BuildMyWork
{
    /** Nombre de lignes affichées par bloc ; le total réel est renvoyé à côté. */
    public const int LIMIT = 6;

    /**
     * @return array{
     *     leads: array{items: list<array<string, mixed>>, total: int}|null,
     *     owner_leads: array{items: list<array<string, mixed>>, total: int}|null,
     *     clients: array{items: list<array<string, mixed>>, total: int}|null
     * }
     */
    public function handle(User $user): array
    {
        $assigned = Lead::query()
            ->with('assignee')
            ->where('assigned_to', $user->id)
            ->where('status', '!=', LeadStatus::Archived)
            ->get();

        $clients = $assigned->where('status', LeadStatus::Converted);
        $open = $assigned->where('status', '!=', LeadStatus::Converted);
        $ownerLeads = $open->filter(fn (Lead $lead): bool => LeadSegment::fromLead($lead) === LeadSegment::Owner);
        $leads = $open->filter(fn (Lead $lead): bool => LeadSegment::fromLead($lead) === LeadSegment::Tenant);

        return [
            'leads' => $user->canRead(SiteSection::Leads) ? $this->block($leads) : null,
            'owner_leads' => $user->canRead(SiteSection::OwnerLeads) ? $this->block($ownerLeads, ownerLabels: true) : null,
            'clients' => $user->canRead(SiteSection::Clients) ? $this->block($clients) : null,
        ];
    }

    /**
     * Les leads à recontacter d'abord (échéance la plus proche), puis les
     * moins récemment contactés : ce qui demande de l'attention monte.
     *
     * @param  Collection<int, Lead>  $leads
     * @return array{items: list<array<string, mixed>>, total: int}
     */
    private function block(Collection $leads, bool $ownerLabels = false): array
    {
        $sorted = $leads->sortBy(fn (Lead $lead): array => [
            $lead->recontact_at->timestamp ?? PHP_INT_MAX,
            $lead->last_contacted_at->timestamp ?? 0,
        ]);

        return [
            'items' => array_values(array_map(
                fn (Lead $lead): array => LeadController::summary($lead, $ownerLabels),
                $sorted->take(self::LIMIT)->values()->all(),
            )),
            'total' => $leads->count(),
        ];
    }
}

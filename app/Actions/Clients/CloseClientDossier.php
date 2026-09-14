<?php

declare(strict_types=1);

namespace App\Actions\Clients;

use App\Actions\Leads\UpdateLeadStatus;
use App\Enums\ClientClosingReason;
use App\Enums\LeadStatus;
use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Clôture un dossier client : il passe en « Archivé » (kanban, listes) et
 * garde la trace qu'il fut un client — date, motif, précision — pour être
 * retrouvé dans les dossiers archivés et rouvert au besoin.
 */
final readonly class CloseClientDossier
{
    public function __construct(private UpdateLeadStatus $updateStatus) {}

    public function handle(Lead $lead, ClientClosingReason $reason, ?string $note = null, ?User $by = null): Lead
    {
        return DB::transaction(function () use ($lead, $reason, $note, $by): Lead {
            $note = trim((string) $note) ?: null;

            $lead = $this->updateStatus->handle($lead, LeadStatus::Archived, null, $by);
            $lead->forceFill(['closed_at' => now(), 'closing_reason' => $reason, 'closing_note' => $note])->save();

            $lead->notes()->create([
                'body' => 'Dossier clôturé : '.$reason->label().($note === null ? '' : " — {$note}").'.',
                'user_id' => $by?->id,
            ]);

            event(new DashboardUpdated(
                'clients',
                ['id' => $lead->id, 'uuid' => $lead->uuid],
                "a clôturé le dossier {$lead->householdName()} (".mb_strtolower($reason->label()).')',
                $by,
            ));

            return $lead;
        });
    }
}

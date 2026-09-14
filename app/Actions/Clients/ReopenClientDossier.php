<?php

declare(strict_types=1);

namespace App\Actions\Clients;

use App\Actions\Leads\UpdateLeadStatus;
use App\Enums\LeadStatus;
use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/** Rouvre un dossier clôturé : il redevient un client suivi, la clôture est effacée. */
final readonly class ReopenClientDossier
{
    public function __construct(private UpdateLeadStatus $updateStatus) {}

    public function handle(Lead $lead, ?User $by = null): Lead
    {
        return DB::transaction(function () use ($lead, $by): Lead {
            $lead = $this->updateStatus->handle($lead, LeadStatus::Converted, null, $by);
            $lead->forceFill(['closed_at' => null, 'closing_reason' => null, 'closing_note' => null])->save();

            $lead->notes()->create(['body' => 'Dossier rouvert.', 'user_id' => $by?->id]);

            event(new DashboardUpdated('clients', ['id' => $lead->id, 'uuid' => $lead->uuid], "a rouvert le dossier {$lead->householdName()}", $by));

            return $lead;
        });
    }
}

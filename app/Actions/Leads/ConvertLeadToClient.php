<?php

declare(strict_types=1);

namespace App\Actions\Leads;

use App\Enums\LeadStatus;
use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Validation\ValidationException;

/**
 * Transforme un lead en client : passage en « Converti » (journalisé,
 * avec la mécanique du kanban), note dédiée et diffusion aux dossiers clients.
 */
final readonly class ConvertLeadToClient
{
    public function __construct(private UpdateLeadStatus $updateLeadStatus) {}

    /**
     * @throws ValidationException si le lead est déjà client
     */
    public function handle(Lead $lead, ?User $by = null): Lead
    {
        if ($lead->status === LeadStatus::Converted) {
            throw ValidationException::withMessages(['status' => __('Ce lead est déjà client.')]);
        }

        $lead = $this->updateLeadStatus->handle($lead, LeadStatus::Converted, null, $by);

        $lead->notes()->create(['body' => 'Lead converti en client : le dossier est ouvert.', 'user_id' => $by?->id]);

        event(new DashboardUpdated('clients', ['id' => $lead->id], "a converti le lead {$lead->fullName()} en client"));

        return $lead;
    }
}

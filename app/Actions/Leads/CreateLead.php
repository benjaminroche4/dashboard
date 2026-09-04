<?php

declare(strict_types=1);

namespace App\Actions\Leads;

use App\Data\LeadData;
use App\Enums\LeadStatus;
use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Enregistre un lead saisi dans la Converting Machine, en haut de la colonne « À traiter ».
 */
final class CreateLead
{
    public function handle(LeadData $data, ?User $by = null): Lead
    {
        return DB::transaction(function () use ($data, $by): Lead {
            Lead::query()->where('status', LeadStatus::Todo)->increment('position');

            $lead = Lead::query()->create([
                ...$data->toArray(),
                'status' => LeadStatus::Todo,
                'position' => 0,
                'created_by' => $by?->id,
            ]);
            $lead->statusChanges()->create(['from_status' => null, 'to_status' => LeadStatus::Todo, 'changed_by' => $by?->id, 'created_at' => now()]);

            event(new DashboardUpdated('leads', ['id' => $lead->id], "a ajouté le lead {$lead->fullName()}"));

            return $lead;
        });
    }
}

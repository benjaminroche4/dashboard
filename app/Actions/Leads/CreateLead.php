<?php

declare(strict_types=1);

namespace App\Actions\Leads;

use App\Data\LeadData;
use App\Enums\LeadSegment;
use App\Enums\LeadStatus;
use App\Enums\WebsiteHelpType;
use App\Events\DashboardUpdated;
use App\Jobs\QualifyLeadJob;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Enregistre un lead saisi dans la Converting Machine, en haut de la colonne « À traiter ».
 */
final readonly class CreateLead
{
    public function __construct(private GenerateLeadReference $generateReference = new GenerateLeadReference) {}

    public function handle(LeadData $data, ?User $by = null): Lead
    {
        return DB::transaction(function () use ($data, $by): Lead {
            Lead::query()->where('status', LeadStatus::Todo)->increment('position');

            $lead = Lead::query()->create([
                ...$data->toArray(),
                'reference' => $this->generateReference->handle(),
                'help_type' => $data->segment === LeadSegment::Owner ? WebsiteHelpType::RentalManagement : null,
                'status' => LeadStatus::Todo,
                'position' => 0,
                'created_by' => $by?->id,
            ]);
            $lead->statusChanges()->create(['from_status' => null, 'to_status' => LeadStatus::Todo, 'changed_by' => $by?->id, 'created_at' => now()]);

            // Sans acteur (webhook du site), le front n'a pas de nom à préfixer : la phrase est complète.
            $kind = $data->segment === LeadSegment::Owner ? 'lead propriétaire' : 'lead';
            $message = $by instanceof User
                ? "a ajouté le {$kind} {$lead->fullName()}"
                : "Nouveau lead depuis le site : {$lead->fullName()}";

            event(new DashboardUpdated('leads', ['id' => $lead->id], $message));

            // Lead arrivé seul (site, téléphone) : l'assistant IA propose une qualification à relire.
            if (! $by instanceof User && config('services.anthropic.key')) {
                dispatch(new QualifyLeadJob($lead))->afterCommit();
            }

            return $lead;
        });
    }
}

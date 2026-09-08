<?php

declare(strict_types=1);

namespace App\Actions\Owners;

use App\Actions\Leads\CreateLead;
use App\Data\LeadPropertyData;
use App\Data\OwnerLeadData;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Enregistre un lead propriétaire (gestion locative) et, s'il est renseigné, le bien qu'il propose.
 */
final readonly class CreateOwnerLead
{
    public function __construct(private CreateLead $createLead) {}

    public function handle(OwnerLeadData $data, ?User $by = null): Lead
    {
        return DB::transaction(function () use ($data, $by): Lead {
            $lead = $this->createLead->handle($data->lead, $by);

            if ($data->property instanceof LeadPropertyData) {
                $lead->property()->create($data->property->toArray());
            }

            return $lead;
        });
    }
}

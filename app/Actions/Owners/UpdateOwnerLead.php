<?php

declare(strict_types=1);

namespace App\Actions\Owners;

use App\Actions\Leads\GeocodeLeadProperty;
use App\Data\LeadPropertyData;
use App\Data\OwnerLeadData;
use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Met à jour le contact d'un lead propriétaire et le bien proposé (créé, modifié ou retiré s'il est vide).
 */
final readonly class UpdateOwnerLead
{
    public function __construct(private GeocodeLeadProperty $geocode) {}

    /** Seuls les champs du formulaire propriétaire sont touchés : le projet locataire et la qualification restent intacts. */
    private const array CONTACT_FIELDS = ['first_name', 'last_name', 'email', 'phone', 'company', 'language', 'source', 'source_note', 'assigned_to'];

    public function handle(Lead $lead, OwnerLeadData $data, ?User $by = null): Lead
    {
        return DB::transaction(function () use ($lead, $data, $by): Lead {
            $lead->fill(array_intersect_key($data->lead->toArray(), array_flip(self::CONTACT_FIELDS)))->save();

            if (! $data->property instanceof LeadPropertyData) {
                $lead->property()->delete();
            } else {
                $property = $lead->property()->updateOrCreate([], $data->property->toArray());

                if ($this->geocode->shouldGeocode($property)) {
                    $this->geocode->handle($property);
                }
            }

            event(new DashboardUpdated('leads', ['id' => $lead->id], "a modifié le lead propriétaire {$lead->fullName()}", $by));

            return $lead->refresh();
        });
    }
}

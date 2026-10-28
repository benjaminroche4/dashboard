<?php

declare(strict_types=1);

namespace App\Actions\Leads;

use App\Events\DashboardUpdated;
use App\Http\Requests\Leads\UpdateLeadPropertyFieldsRequest;
use App\Models\Lead;
use App\Models\LeadProperty;

/**
 * Écrit les champs du bien proposé modifiés en place depuis la fiche d'un lead
 * propriétaire. Le bien est créé au premier champ renseigné ; une chaîne vide
 * ou une liste vide vaut null ; rien n'est enregistré ni diffusé sans
 * changement. Une adresse qui change est géocodée pour « Voir sur la carte ».
 */
final readonly class UpdateLeadPropertyFields
{
    public function __construct(private GeocodeLeadProperty $geocode) {}

    /**
     * @param  array<string, mixed>  $fields  Clés parmi `UpdateLeadPropertyFieldsRequest::FIELDS`.
     */
    public function handle(Lead $lead, array $fields): LeadProperty
    {
        /** @var LeadProperty $property */
        $property = $lead->property()->firstOrNew();
        $clean = [];

        foreach (array_intersect_key($fields, UpdateLeadPropertyFieldsRequest::FIELDS) as $key => $value) {
            $clean[$key] = match (true) {
                is_string($value) && trim($value) === '' => null,
                is_array($value) && $value === [] => null,
                is_string($value) => trim($value),
                default => $value,
            };
        }

        // Une adresse tapée sans suggestion ne garde pas le lieu Google de l'ancienne.
        if (array_key_exists('address', $clean) && ! array_key_exists('place_id', $clean)) {
            $clean['place_id'] = null;
        }

        $property->fill($clean);

        if ($property->exists && ! $property->isDirty()) {
            return $property;
        }

        $changed = array_values(array_unique(array_map(
            fn (string $key): string => UpdateLeadPropertyFieldsRequest::FIELDS[$key],
            array_keys(array_intersect_key($property->getDirty(), UpdateLeadPropertyFieldsRequest::FIELDS)),
        )));
        $property->save();

        if ($this->geocode->shouldGeocode($property)) {
            $this->geocode->handle($property);
        }

        if ($changed === []) {
            return $property;
        }

        event(new DashboardUpdated(
            'leads',
            ['id' => $lead->id],
            'a modifié '.implode(', ', $changed)." du bien proposé par {$lead->fullName()}",
        ));

        return $property;
    }
}

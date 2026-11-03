<?php

declare(strict_types=1);

namespace App\Actions\Properties;

use App\Events\DashboardUpdated;
use App\Http\Requests\Properties\UpdatePropertyFieldsRequest;
use App\Models\Agent;
use App\Models\Property;
use App\Models\User;
use App\Support\PropertyTitle;

/**
 * Écrit les champs d'un bien modifiés en place depuis sa fiche. Une chaîne ou
 * une liste vide vaut null ; le nom du bien est recalculé (il n'est jamais
 * saisi) ; choisir un agent rattaché pose aussi son agence, changer d'agence
 * retire un agent d'une autre agence ; rien n'est enregistré ni diffusé sans
 * changement.
 */
final class UpdatePropertyFields
{
    /**
     * @param  array<string, mixed>  $fields  Clés parmi `UpdatePropertyFieldsRequest::FIELDS`.
     */
    public function handle(Property $property, array $fields, ?User $by = null): Property
    {
        $clean = [];

        foreach (array_intersect_key($fields, UpdatePropertyFieldsRequest::FIELDS) as $key => $value) {
            $clean[$key] = match (true) {
                is_string($value) && trim($value) === '' => null,
                is_string($value) => trim($value),
                is_array($value) && $value === [] => null,
                $key === 'charges_included' => (bool) $value,
                default => $value,
            };
        }

        // L'agent et son agence vont ensemble.
        if (isset($clean['agent_id']) && ! array_key_exists('agency_id', $clean)) {
            $agencyId = Agent::query()->whereKey($clean['agent_id'])->value('agency_id');

            if ($agencyId !== null) {
                $clean['agency_id'] = $agencyId;
            }
        }

        if (array_key_exists('agency_id', $clean) && ! array_key_exists('agent_id', $clean) && $property->agent_id !== null) {
            $agentAgency = Agent::query()->whereKey($property->agent_id)->value('agency_id');

            if ($agentAgency !== null && $agentAgency !== $clean['agency_id']) {
                $clean['agent_id'] = null;
            }
        }

        $property->fill($clean);
        $property->title = PropertyTitle::forProperty($property);

        if (! $property->isDirty()) {
            return $property;
        }

        $changed = array_values(array_unique(array_map(
            fn (string $key): string => UpdatePropertyFieldsRequest::FIELDS[$key],
            array_keys(array_intersect_key($property->getDirty(), UpdatePropertyFieldsRequest::FIELDS)),
        )));
        $property->save();

        event(new DashboardUpdated(
            'properties',
            ['id' => $property->id],
            ($changed === [] ? 'a renommé le' : 'a modifié '.implode(', ', $changed).' du')." bien {$property->label()}",
            $by,
        ));

        return $property;
    }
}

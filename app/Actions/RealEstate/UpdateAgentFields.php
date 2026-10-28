<?php

declare(strict_types=1);

namespace App\Actions\RealEstate;

use App\Actions\Directory\GeocodeDirectoryEntry;
use App\Events\DashboardUpdated;
use App\Http\Requests\RealEstate\UpdateAgentFieldsRequest;
use App\Models\Agent;

/**
 * Écrit les champs d'un agent modifiés en place depuis sa fiche. Une chaîne
 * vide vaut null ; rattacher l'agent à une agence efface son adresse propre
 * (il travaille à celle de l'agence, comme dans `AgentData`) ; une liste vide
 * du profil de matching vaut null ; rien n'est enregistré ni diffusé sans
 * changement.
 */
final readonly class UpdateAgentFields
{
    public function __construct(private GeocodeDirectoryEntry $geocode) {}

    /**
     * @param  array<string, mixed>  $fields  Clés parmi `UpdateAgentFieldsRequest::FIELDS`.
     */
    public function handle(Agent $agent, array $fields): Agent
    {
        $clean = [];

        foreach (array_intersect_key($fields, UpdateAgentFieldsRequest::FIELDS) as $key => $value) {
            $clean[$key] = match (true) {
                is_string($value) && trim($value) === '' => null,
                is_string($value) => trim($value),
                is_array($value) && $value === [] => null,
                $key === 'districts' && is_array($value) => array_values(array_unique(array_map(intval(...), $value))),
                $key === 'agency_id' && $value !== null => (int) $value,
                default => $value,
            };
        }

        if (($clean['agency_id'] ?? $agent->agency_id) !== null) {
            $clean += ['street' => null, 'postal_code' => null, 'city' => null];
        }

        $agent->fill($clean);

        if (! $agent->isDirty()) {
            return $agent;
        }

        // Rue, code postal et ville partagent un libellé : une seule mention.
        $changed = array_values(array_unique(array_map(
            fn (string $key): string => UpdateAgentFieldsRequest::FIELDS[$key],
            array_keys(array_intersect_key($agent->getDirty(), UpdateAgentFieldsRequest::FIELDS)),
        )));
        $agent->save();

        if ($agent->street === null && $agent->latitude !== null) {
            $agent->forceFill(['latitude' => null, 'longitude' => null])->saveQuietly();
        } elseif ($this->geocode->shouldGeocode($agent)) {
            $this->geocode->handle($agent);
        }

        event(new DashboardUpdated(
            'agents',
            ['id' => $agent->id],
            'a modifié '.implode(', ', $changed)." de l'agent {$agent->fullName()}",
        ));

        return $agent;
    }
}

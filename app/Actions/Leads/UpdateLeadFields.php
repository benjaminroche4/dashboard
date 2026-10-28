<?php

declare(strict_types=1);

namespace App\Actions\Leads;

use App\Events\DashboardUpdated;
use App\Http\Requests\Leads\UpdateLeadFieldsRequest;
use App\Models\Lead;

/**
 * Écrit les champs du projet modifiés en place depuis la fiche. Une chaîne
 * vide vaut null, une liste vide aussi ; rien n'est enregistré ni diffusé
 * quand aucune valeur ne change.
 */
final class UpdateLeadFields
{
    /**
     * @param  array<string, mixed>  $fields  Clés parmi `UpdateLeadFieldsRequest::FIELDS`.
     */
    public function handle(Lead $lead, array $fields): Lead
    {
        $clean = [];

        foreach (array_intersect_key($fields, UpdateLeadFieldsRequest::FIELDS) as $key => $value) {
            $clean[$key] = match (true) {
                is_string($value) && trim($value) === '' => null,
                is_array($value) && $value === [] => null,
                $key === 'origin_country' && is_string($value) => strtoupper(trim($value)),
                is_string($value) => trim($value),
                default => $value,
            };
        }

        $lead->fill($clean);

        if (! $lead->isDirty()) {
            return $lead;
        }

        // Ville et pays d'origine partagent un libellé : une seule mention.
        $changed = array_values(array_unique(array_map(
            fn (string $key): string => UpdateLeadFieldsRequest::FIELDS[$key],
            array_keys($lead->getDirty()),
        )));
        $lead->save();

        event(new DashboardUpdated(
            'leads',
            ['id' => $lead->id],
            'a modifié '.implode(', ', $changed)." du lead {$lead->fullName()}",
        ));

        return $lead;
    }
}

<?php

declare(strict_types=1);

namespace App\Actions\Leads;

use App\Data\LeadQualificationData;
use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\User;

/**
 * Applique tout ou partie de la qualification proposée par l'assistant, sans
 * jamais écraser une valeur déjà renseignée, puis efface la proposition.
 */
final class ApplyLeadQualification
{
    /**
     * @param  list<string>|null  $keys  Champs retenus ; null = toutes les propositions
     * @return list<string> Champs effectivement écrits
     */
    public function handle(Lead $lead, ?array $keys = null, ?User $by = null): array
    {
        if ($lead->ai_qualification === null) {
            return [];
        }

        $data = LeadQualificationData::from($lead->ai_qualification);
        $proposals = $data->proposals($lead);
        $proposed = array_column($proposals, 'key');
        $chosen = $keys === null ? $proposed : array_values(array_intersect($proposed, $keys));
        $attributes = $data->attributes($chosen);

        $note = trim((string) $lead->qualification_note);
        if ($data->summary !== '' && ! str_contains($note, $data->summary)) {
            $note = trim($note."\n\n".$data->summary.($data->scoreReason !== null && in_array('score', $chosen, true) ? "\n".$data->scoreReason : ''));
            $attributes['qualification_note'] = $note;
        }

        $lead->forceFill([...$attributes, 'ai_qualification' => null, 'ai_qualified_at' => null])->save();

        $labels = array_column(array_filter($proposals, fn (array $row): bool => in_array($row['key'], $chosen, true)), 'label');
        $lead->notes()->create([
            'body' => $labels === [] ? 'Qualification IA relue, résumé ajouté.' : 'Qualification IA appliquée : '.implode(', ', $labels).'.',
            'user_id' => $by?->id,
        ]);

        event(new DashboardUpdated('leads', ['id' => $lead->id], "a appliqué la qualification IA du lead {$lead->fullName()}", $by));

        return $chosen;
    }
}

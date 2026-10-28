<?php

declare(strict_types=1);

namespace App\Actions\Directory;

use App\Models\Activity;
use App\Models\Agency;
use App\Models\Agent;
use App\Models\Owner;
use App\Models\Partner;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;

/**
 * Tous les échanges notés avec une entrée de l'annuaire (agent, agence,
 * partenaire, propriétaire), du plus récent au plus ancien : la fiche n'en
 * montre que le dernier, la modale « Voir l'historique » les montre tous.
 *
 * Un échange est une entrée du journal marquée `kind = contact` dans son
 * payload (posée par les Actions Touch…), ou, pour les entrées antérieures,
 * dont le message commence par « a noté un échange ». La date affichée est
 * celle de l'échange (`at` du payload), pas celle de la saisie.
 */
final class ListContactHistory
{
    public const string KIND = 'contact';

    /**
     * @return list<array{id: int, at: string, noted_at: string, by: array{id: int, name: string, avatar: string|null}|null}>
     */
    public function handle(Agent|Agency|Partner|Owner $entry): array
    {
        $contacts = Activity::query()
            ->with('actor')
            ->where(fn (Builder $query): Builder => $this->scope($query, $entry))
            ->where(fn (Builder $query): Builder => $query
                ->where('payload->kind', self::KIND)
                ->orWhere('message', 'like', 'a noté un échange avec%'))
            ->latest('created_at')
            ->latest('id')
            ->get()
            ->map(fn (Activity $activity): array => [
                'id' => $activity->id,
                'at' => $this->contactedAt($activity)->toIso8601String(),
                'noted_at' => $activity->created_at->toIso8601String(),
                'by' => $activity->actor === null ? null : [
                    'id' => $activity->actor->id,
                    'name' => $activity->actor->name,
                    'avatar' => $activity->actor->avatar,
                ],
            ])
            ->sortByDesc('at')
            ->all();

        return array_values($contacts);
    }

    /**
     * @param  Builder<Activity>  $query
     * @return Builder<Activity>
     */
    private function scope(Builder $query, Agent|Agency|Partner|Owner $entry): Builder
    {
        return match (true) {
            $entry instanceof Agent => $query->where('agent_id', $entry->id),
            $entry instanceof Agency => $query->where('agency_id', $entry->id),
            $entry instanceof Partner => $query->where('partner_id', $entry->id),
            // Un propriétaire n'a pas sa colonne dans le journal : c'est
            // l'identifiant du payload d'une action « owners » qui le désigne.
            default => $query->where('resource', 'owners')->where('payload->id', $entry->id),
        };
    }

    /** La date de l'échange tel qu'il a été noté, à défaut celle de la saisie. */
    private function contactedAt(Activity $activity): CarbonImmutable
    {
        $at = $activity->payload['at'] ?? null;

        if (is_string($at) && $at !== '') {
            try {
                return CarbonImmutable::parse($at);
            } catch (\Throwable) {
                // Une date illisible retombe sur la saisie.
            }
        }

        return $activity->created_at->toImmutable();
    }
}

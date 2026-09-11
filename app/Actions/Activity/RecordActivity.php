<?php

declare(strict_types=1);

namespace App\Actions\Activity;

use App\Events\DashboardUpdated;
use App\Models\Activity;
use App\Models\Agency;
use App\Models\Agent;
use App\Models\Lead;
use App\Models\Partner;
use App\Support\ActivityResource;

/**
 * Journalise un DashboardUpdated : acteur, ressource, message et payload,
 * plus le lead concerné quand la ressource en désigne un (`leads`, `clients`
 * avec `id`, ou `lead_id` dans le payload). Sans message, rien n'est écrit.
 */
final class RecordActivity
{
    public function handle(DashboardUpdated $event): ?Activity
    {
        if ($event->message === null || trim($event->message) === '') {
            return null;
        }

        return Activity::query()->create([
            'resource' => $event->resource,
            'message' => $event->message,
            'user_id' => $event->actor['id'] ?? null,
            'lead_id' => $this->leadId($event),
            'partner_id' => $this->partnerId($event),
            'agency_id' => $this->directoryId($event, Agency::class, 'agencies'),
            'agent_id' => $this->directoryId($event, Agent::class, 'agents'),
            'payload' => $event->payload,
            'created_at' => now(),
        ]);
    }

    /** Partenaire visé par l'action : `partner_id` du payload, ou l'`id` d'une action « partners ». */
    private function partnerId(DashboardUpdated $event): ?int
    {
        $id = $event->payload['partner_id'] ?? null;

        if ($id === null && $event->resource === 'partners') {
            $id = $event->payload['id'] ?? null;
        }

        if (! is_int($id) && (! is_string($id) || ! ctype_digit($id))) {
            return null;
        }

        // Le partenaire peut avoir été supprimé par l'action journalisée.
        return Partner::query()->whereKey((int) $id)->exists() ? (int) $id : null;
    }

    /**
     * Agence ou agent visé : `agency_id` / `agent_id` du payload, ou l'`id`
     * quand l'action porte justement sur cette ressource.
     *
     * @param  class-string<Agency|Agent>  $model
     */
    private function directoryId(DashboardUpdated $event, string $model, string $resource): ?int
    {
        $key = $resource === 'agents' ? 'agent_id' : 'agency_id';
        $id = $event->payload[$key] ?? null;

        if ($id === null && $event->resource === $resource) {
            $id = $event->payload['id'] ?? null;
        }

        if (! is_int($id) && (! is_string($id) || ! ctype_digit($id))) {
            return null;
        }

        // L'entrée peut avoir été supprimée par l'action journalisée.
        return $model::query()->whereKey((int) $id)->exists() ? (int) $id : null;
    }

    private function leadId(DashboardUpdated $event): ?int
    {
        $id = $event->payload['lead_id'] ?? null;

        if ($id === null && ActivityResource::concernsLead($event->resource)) {
            $id = $event->payload['id'] ?? null;
        }

        if (! is_int($id) && (! is_string($id) || ! ctype_digit($id))) {
            return null;
        }

        // Le lead peut avoir été supprimé par l'action journalisée : on ne garde que les liens valides.
        return Lead::query()->whereKey((int) $id)->exists() ? (int) $id : null;
    }
}

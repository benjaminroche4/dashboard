<?php

declare(strict_types=1);

namespace App\Actions\Activity;

use App\Events\DashboardUpdated;
use App\Models\Activity;
use App\Models\Lead;
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
            'payload' => $event->payload,
            'created_at' => now(),
        ]);
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

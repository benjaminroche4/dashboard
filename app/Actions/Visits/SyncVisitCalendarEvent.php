<?php

declare(strict_types=1);

namespace App\Actions\Visits;

use App\Actions\Leads\SendLeadDossier;
use App\Enums\VisitStatus;
use App\Models\Visit;
use App\Services\GoogleCalendar;

/**
 * Tient l'agenda du membre qui réalise la visite : une visite planifiée y
 * pose un événement de 30 minutes à l'adresse du bien ; la déplacer le
 * déplace, l'annuler ou changer de membre le retire. L'agenda est celui de
 * l'adresse professionnelle du membre (compte de service Workspace, comme la
 * visio) — un membre hors domaine n'a pas d'agenda à tenir. Jamais bloquant :
 * une panne de Google se journalise, la visite reste enregistrée.
 */
final readonly class SyncVisitCalendarEvent
{
    /** Une visite dure une demi-heure dans l'agenda, comme dans l'invitation envoyée au client. */
    public const int DURATION_MINUTES = 30;

    public function __construct(private GoogleCalendar $calendar) {}

    public function handle(Visit $visit): void
    {
        if (! $this->calendar->isConfigured()) {
            return;
        }

        // `assignee` est rechargé à chaque fois : après un changement de membre, la
        // relation déjà chargée pointerait encore sur l'ancien agenda.
        $visit->loadMissing(['lead', 'property', 'agent'])->load('assignee');
        $owner = $visit->assignee;
        // L'agenda à tenir : celui du membre, s'il y en a un, que la visite
        // tient toujours, et dont l'adresse est sur un domaine Workspace.
        $target = $visit->status !== VisitStatus::Cancelled && $owner !== null && SendLeadDossier::canSendAs($owner->email)
            ? $owner->email
            : null;

        // L'événement vit dans un autre agenda que celui qu'il faut tenir : on le retire d'abord.
        if ($visit->calendar_event_id !== null && $visit->calendar_email !== $target) {
            $this->calendar->delete($visit->calendar_event_id, $visit->calendar_email);
            $visit->forceFill(['calendar_event_id' => null, 'calendar_email' => null])->saveQuietly();
        }

        if ($target === null) {
            return;
        }

        $eventId = $this->calendar->upsertEvent(
            $visit->calendar_event_id,
            self::summary($visit),
            self::description($visit),
            $visit->scheduled_at,
            $visit->scheduled_at->copy()->addMinutes(self::DURATION_MINUTES),
            self::location($visit),
            [$target],
            $target,
        );

        if ($eventId !== null && $eventId !== $visit->calendar_event_id) {
            $visit->forceFill(['calendar_event_id' => $eventId, 'calendar_email' => $target])->saveQuietly();
        }
    }

    /** Retire l'événement d'une visite qu'on supprime. */
    public function forget(Visit $visit): void
    {
        if ($visit->calendar_event_id === null || ! $this->calendar->isConfigured()) {
            return;
        }

        $this->calendar->delete($visit->calendar_event_id, $visit->calendar_email);
    }

    public static function summary(Visit $visit): string
    {
        return 'Visite · '.$visit->lead->fullName().' — '.$visit->property->label();
    }

    public static function location(Visit $visit): ?string
    {
        $property = $visit->property;
        $line = implode(', ', array_filter([$property->street, trim(($property->postal_code ?? '').' '.($property->city ?? ''))]));

        return $line === '' ? null : $line;
    }

    /** Ce qu'il faut avoir sous les yeux en arrivant : le client, le mode, l'agent, les consignes, la fiche. */
    public static function description(Visit $visit): string
    {
        $lead = $visit->lead;

        return implode("\n", array_filter([
            'Client : '.$lead->fullName().($lead->phone === null ? '' : " · {$lead->phone}"),
            $visit->mode->label(),
            $visit->agent === null ? null : 'Agent immobilier : '.$visit->agent->fullName().($visit->agent->phone === null ? '' : " · {$visit->agent->phone}"),
            $visit->notes === null || trim($visit->notes) === '' ? null : 'Consignes : '.trim($visit->notes),
            route('clients.visits.show', $visit),
        ], fn (?string $line): bool => $line !== null));
    }
}

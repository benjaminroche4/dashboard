<?php

declare(strict_types=1);

namespace App\Actions\Visits;

use App\Actions\Properties\CreateProperty;
use App\Data\VisitData;
use App\Events\DashboardUpdated;
use App\Mail\VisitScheduled;
use App\Models\Lead;
use App\Models\Property;
use App\Models\User;
use App\Models\Visit;
use App\Support\IcsInvite;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

/**
 * Planifie une visite pour un client. Un bien saisi à la volée est d'abord
 * ajouté à l'annuaire « Biens », puis la visite est notée sur le lead. Sur
 * demande, le client reçoit la confirmation par e-mail (invitation ICS jointe).
 */
final readonly class ScheduleVisit
{
    public function __construct(private CreateProperty $createProperty) {}

    public function handle(VisitData $data, ?User $by = null): Visit
    {
        $visit = DB::transaction(function () use ($data, $by): Visit {
            $lead = Lead::query()->findOrFail($data->leadId);
            $property = $data->propertyId !== null
                ? Property::query()->findOrFail($data->propertyId)
                : $this->createProperty->handle($data->property ?? throw new \InvalidArgumentException('Un bien existant ou un nouveau bien est requis.'), $by);

            $visit = Visit::query()->create([
                'lead_id' => $lead->id,
                'property_id' => $property->id,
                'agent_id' => $data->agentId ?? $property->agent_id,
                'assigned_to' => $data->assignedTo,
                'scheduled_at' => $data->scheduledAt,
                'notes' => $data->notes,
                'created_by' => $by?->id,
            ]);

            $when = $data->scheduledAt->translatedFormat('j F Y \à H:i');
            $lead->notes()->create(['body' => "Visite planifiée le {$when} : {$property->label()}.", 'user_id' => $by?->id]);

            event(new DashboardUpdated('visits', ['id' => $visit->id], "a planifié une visite pour {$lead->fullName()} : {$property->label()}", $by));

            return $visit;
        });

        if ($data->notifyClient) {
            $this->notifyClient($visit, $by);
        }

        return $visit;
    }

    /** Envoie la confirmation au client, dans sa langue, si son adresse est connue. */
    private function notifyClient(Visit $visit, ?User $by): void
    {
        $visit->load(['lead.assignee', 'property', 'agent.agency']);
        $lead = $visit->lead;

        if ($lead->email === null || $lead->email === '') {
            return;
        }

        $fr = $lead->language->value !== 'en';
        $start = $visit->scheduled_at->toImmutable();
        $advisor = $lead->assignee;
        $attendees = [['email' => $lead->email, 'name' => $lead->fullName()]];

        if ($advisor !== null) {
            $attendees[] = ['email' => $advisor->email, 'name' => $advisor->name];
        }

        $ics = IcsInvite::build(
            uid: "visit-{$visit->id}@relocation-in-paris.fr",
            summary: ($fr ? 'Visite : ' : 'Viewing: ').$visit->property->label(),
            description: ($fr ? 'Visite du logement avec Relocation in Paris.' : 'Home viewing with Relocation in Paris.')."\n".VisitScheduled::address($visit),
            start: $start,
            end: $start->addMinutes(VisitScheduled::DURATION_MINUTES),
            organizerEmail: $advisor !== null ? $advisor->email : (string) config('mail.from.address'),
            organizerName: $advisor !== null ? $advisor->name : (string) config('mail.from.name'),
            attendees: $attendees,
        );

        $mailable = new VisitScheduled($visit, $ics);

        if ($advisor !== null) {
            $mailable->replyTo($advisor->email, $advisor->name);
        }

        Mail::to($lead->email, $lead->fullName())->locale($lead->language->value)->send($mailable);

        $lead->notes()->create(['body' => "Confirmation de visite envoyée à {$lead->email}.", 'user_id' => $by?->id]);
    }
}

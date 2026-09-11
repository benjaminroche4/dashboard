<?php

declare(strict_types=1);

namespace App\Actions\Visits;

use App\Actions\Properties\CreateProperty;
use App\Data\PropertyData;
use App\Data\VisitData;
use App\Enums\Offer;
use App\Enums\VisitMode;
use App\Events\DashboardUpdated;
use App\Mail\VisitScheduled;
use App\Models\Lead;
use App\Models\Property;
use App\Models\User;
use App\Models\Visit;
use App\Support\HouseholdMail;
use App\Support\IcsInvite;
use App\Support\PropertyAddress;
use Illuminate\Support\Facades\DB;

/**
 * Planifie une visite pour un client. Un bien saisi à la volée est d'abord
 * ajouté à l'annuaire « Biens » — sauf si l'annuaire connaît déjà la même
 * adresse, auquel cas la visite reprend ce bien plutôt que d'en créer un
 * doublon —, puis la visite est notée sur le lead. Sur demande, le client
 * reçoit la confirmation par e-mail (invitation ICS jointe).
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
                : $this->newProperty($data->property ?? throw new \InvalidArgumentException('Un bien existant ou un nouveau bien est requis.'), $by);

            $visit = Visit::query()->create([
                'lead_id' => $lead->id,
                'property_id' => $property->id,
                'agent_id' => $data->agentId ?? $property->agent_id,
                'assigned_to' => $data->assignedTo,
                'scheduled_at' => $data->scheduledAt,
                'mode' => $data->mode,
                'notes' => $data->notes,
                'created_by' => $by?->id,
            ]);

            $when = $data->scheduledAt->translatedFormat('j F Y \à H:i');
            $how = $data->mode === VisitMode::ClientAlone ? ' (visite autonome du client)' : '';
            $lead->notes()->create(['body' => "Visite planifiée le {$when} : {$property->label()}{$how}.", 'user_id' => $by?->id]);

            event(new DashboardUpdated('visits', ['id' => $visit->id], "a planifié une visite pour {$lead->fullName()} : {$property->label()}", $by));

            return $visit;
        });

        if ($data->notifyClient) {
            $this->notifyClient($visit, $by);
        }

        return $visit;
    }

    /**
     * Le bien saisi dans le formulaire : celui de l'annuaire qui porte déjà
     * cette adresse, sinon un nouveau bien.
     */
    private function newProperty(PropertyData $data, ?User $by): Property
    {
        return $this->existing($data) ?? $this->createProperty->handle($data, $by);
    }

    /**
     * Bien de l'annuaire à la même adresse. Les candidats sont réduits par le
     * code postal (ou la ville) puis comparés sur l'empreinte de l'adresse,
     * la ponctuation et les accents d'une saisie à l'autre ne devant pas
     * créer de doublon.
     */
    private function existing(PropertyData $data): ?Property
    {
        $key = PropertyAddress::key($data->street, $data->postalCode, $data->city);

        if ($key === null) {
            return null;
        }

        return Property::query()
            ->when($data->postalCode !== null, fn ($query) => $query->where('postal_code', $data->postalCode))
            ->when($data->postalCode === null && $data->city !== null, fn ($query) => $query->where('city', $data->city))
            ->get()
            ->first(fn (Property $property): bool => PropertyAddress::key($property->street, $property->postal_code, $property->city) === $key);
    }

    /** Envoie la confirmation au client, dans sa langue, si son adresse est connue. */
    private function notifyClient(Visit $visit, ?User $by): void
    {
        $visit->load(['lead.assignee', 'lead.coAssignee', 'property', 'agent.agency']);
        $lead = $visit->lead;

        // Formule « Confié » : le client ne vient pas, on ne l'invite pas.
        if ($lead->offer === Offer::Confie) {
            return;
        }

        if ($lead->email === null || $lead->email === '') {
            return;
        }

        $fr = $lead->language->value !== 'en';
        $start = $visit->scheduled_at->toImmutable();
        $advisor = $lead->assignee;
        $attendees = $lead->mailRecipients();

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

        $sentTo = HouseholdMail::send($lead, $mailable);

        $lead->notes()->create(['body' => 'Confirmation de visite envoyée à '.implode(', ', $sentTo).'.', 'user_id' => $by?->id]);
    }
}

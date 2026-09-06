<?php

declare(strict_types=1);

namespace App\Actions\Leads;

use App\Enums\RecontactChannel;
use App\Events\DashboardUpdated;
use App\Mail\LeadVisioScheduled;
use App\Models\Lead;
use App\Models\User;
use App\Services\GoogleCalendar;
use App\Support\IcsInvite;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

/**
 * Programme (ou déplace) l'appel vidéo avec un lead, comme sur le site :
 * événement Google Calendar dans l'agenda du conseiller avec lien Meet,
 * invitation ICS jointe à l'e-mail du lead dans sa langue, note et recontact
 * mis à jour. Le mot « visio » ne s'affiche jamais côté client.
 */
final readonly class ScheduleLeadVisio
{
    public const int DURATION_MINUTES = 20;

    public function __construct(private GoogleCalendar $calendar) {}

    /**
     * @throws ValidationException si le lead n'a pas d'e-mail
     */
    public function handle(Lead $lead, CarbonImmutable $at, ?User $by = null): Lead
    {
        if ($lead->email === null || $lead->email === '') {
            throw ValidationException::withMessages(['email' => __('Ajoutez un e-mail au lead avant de programmer une visio.')]);
        }

        $lead->loadMissing('assignee');
        $rescheduled = $lead->visio_at !== null;
        $start = $at->setTimezone('Europe/Paris');
        $end = $start->addMinutes(self::DURATION_MINUTES);
        $fr = $lead->language->value !== 'en';
        $assignee = $lead->assignee;
        $organizer = $assignee !== null && SendLeadDossier::canSendAs($assignee->email) ? $assignee->email : $this->calendar->organizer();
        $organizerName = $organizer === $assignee?->email ? $assignee->name : (string) config('company.name');
        $title = self::title($lead, $fr);
        $description = "{$lead->fullName()} / {$lead->email}".($lead->phone !== null ? " / {$lead->phone}" : '');
        $attendees = array_values(array_unique(array_filter([$lead->email, $assignee?->email])));

        $event = $this->calendar->upsertVisio($lead->visio_event_id, $title, $description, $start, $end, $attendees, $organizer);
        $meetLink = $event['meetLink'] ?? $lead->visio_meet_link;

        $lead->forceFill([
            'visio_at' => $start,
            'visio_event_id' => $event['eventId'] ?? $lead->visio_event_id,
            'visio_meet_link' => $meetLink,
            'recontact_channel' => RecontactChannel::Visio,
            'recontact_at' => $start->toDateString(),
            'last_contacted_at' => now(),
        ])->save();

        $uid = $lead->visio_event_id !== null ? "{$lead->visio_event_id}@google.com" : "visio-lead-{$lead->id}@relocation-in-paris.fr";
        $ics = IcsInvite::build(
            uid: $uid,
            summary: $title,
            description: ucfirst(self::phrase($lead, $fr)).', Relocation in Paris.'.($meetLink !== null ? ($fr ? "\nRejoindre : " : "\nJoin: ").$meetLink : ''),
            start: $start,
            end: $end,
            organizerEmail: (string) ($organizer ?? config('mail.from.address')),
            organizerName: $organizerName,
            attendees: array_filter([
                ['email' => $lead->email, 'name' => $lead->fullName()],
                $assignee !== null ? ['email' => $assignee->email, 'name' => $assignee->name] : null,
            ]),
            url: $meetLink,
        );

        $mailable = new LeadVisioScheduled($lead, $start, $meetLink, $rescheduled, $ics);

        if ($assignee !== null) {
            $mailable->replyTo($assignee->email, $assignee->name);

            if ($organizer === $assignee->email) {
                $mailable->from($assignee->email, "{$assignee->name} · ".config('mail.from.name'));
            }
        }

        Mail::to($lead->email, $lead->fullName())->locale($lead->language->value)->send($mailable);

        $when = $start->settings(['locale' => 'fr'])->translatedFormat('l j F \à H\hi');
        $lead->notes()->create(['body' => ($rescheduled ? 'Visio déplacée au ' : 'Visio programmée le ')."{$when}, invitation envoyée à {$lead->email}.".($meetLink !== null ? " Meet : {$meetLink}" : ''), 'user_id' => $by?->id]);

        event(new DashboardUpdated('leads', ['id' => $lead->id], ($rescheduled ? 'a déplacé la visio avec ' : 'a programmé une visio avec ').$lead->fullName()." ({$when})"));

        return $lead;
    }

    /** « Léa • Charles - Votre nouvel appartement à Paris », le titre vu par le client. */
    public static function title(Lead $lead, bool $fr): string
    {
        $advisor = self::advisorFirstName($lead);
        $who = $advisor !== null ? "{$lead->first_name} • {$advisor}" : $lead->first_name;

        return "{$who} - ".($fr ? 'Votre nouvel appartement à Paris' : 'Your new Home in Paris');
    }

    /** « appel vidéo avec Charles » / « video call with Charles », sans le mot visio. */
    public static function phrase(Lead $lead, bool $fr): string
    {
        $advisor = self::advisorFirstName($lead);

        if ($fr) {
            return $advisor !== null ? "appel vidéo avec {$advisor}" : 'appel vidéo';
        }

        return $advisor !== null ? "video call with {$advisor}" : 'video call';
    }

    public static function advisorFirstName(Lead $lead): ?string
    {
        $name = trim((string) $lead->assignee?->name);

        return $name === '' ? null : explode(' ', $name)[0];
    }
}

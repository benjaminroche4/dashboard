<?php

declare(strict_types=1);

namespace App\Mail;

use App\Actions\Leads\ScheduleLeadVisio;
use App\Models\Lead;
use Carbon\CarbonImmutable;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Attachment;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Confirmation d'appel vidéo au lead, dans sa langue, avec l'invitation
 * ICS jointe et les liens « ajouter à l'agenda ». Charte du site RIP.
 */
final class LeadVisioScheduled extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Lead $lead,
        public readonly CarbonImmutable $visioAt,
        public readonly ?string $meetLink,
        public readonly bool $rescheduled,
        private readonly string $ics,
    ) {}

    public function envelope(): Envelope
    {
        $fr = app()->getLocale() !== 'en';
        $when = self::dateText($this->visioAt, $fr);

        return new Envelope(subject: match ([$fr, $this->rescheduled]) {
            [true, false] => "Votre appel vidéo est confirmé : {$when}",
            [true, true] => "Votre appel vidéo est déplacé au {$when}",
            [false, false] => "Your video call is confirmed: {$when}",
            default => "Your video call moved to {$when}",
        });
    }

    public function content(): Content
    {
        $fr = app()->getLocale() !== 'en';
        $this->lead->loadMissing('assignee');

        return new Content(view: 'emails.leads.visio', with: [
            'lead' => $this->lead,
            'fr' => $fr,
            'visioAt' => $this->visioAt,
            'dateBig' => $this->visioAt->settings(['locale' => $fr ? 'fr' : 'en'])->translatedFormat('l j F'),
            'timeBig' => $this->visioAt->format($fr ? 'H\hi' : 'H:i'),
            'meetLink' => $this->meetLink,
            'mode' => $this->rescheduled ? 'rescheduled' : 'scheduled',
            'agentName' => ScheduleLeadVisio::advisorFirstName($this->lead),
            'duration' => ScheduleLeadVisio::DURATION_MINUTES,
            'calendarLinks' => $this->calendarLinks($fr),
            'mail' => config('company.mail'),
        ]);
    }

    /**
     * @return list<Attachment>
     */
    public function attachments(): array
    {
        return [Attachment::fromData(fn (): string => $this->ics, 'invitation.ics')->withMime('text/calendar')];
    }

    /** « mardi 12 août à 14h00 » / « Tuesday 12 August at 14:00 », en heure de Paris. */
    public static function dateText(CarbonImmutable $at, bool $fr): string
    {
        $day = $at->settings(['locale' => $fr ? 'fr' : 'en'])->translatedFormat('l j F');

        return $fr ? "{$day} à ".$at->format('H\hi') : "{$day} at ".$at->format('H:i');
    }

    /**
     * Liens « ajouter à l'agenda » Google et Outlook, complément de la pièce jointe.
     *
     * @return array<string, string>
     */
    private function calendarLinks(bool $fr): array
    {
        $title = ScheduleLeadVisio::title($this->lead, $fr);
        $details = ucfirst(ScheduleLeadVisio::phrase($this->lead, $fr)).', Relocation in Paris.'.($this->meetLink !== null ? ($fr ? ' Rejoindre : ' : ' Join: ').$this->meetLink : '');
        $start = $this->visioAt->setTimezone('UTC');
        $end = $start->addMinutes(ScheduleLeadVisio::DURATION_MINUTES);

        return [
            'Google Calendar' => 'https://calendar.google.com/calendar/render?'.http_build_query([
                'action' => 'TEMPLATE',
                'text' => $title,
                'dates' => $start->format('Ymd\THis\Z').'/'.$end->format('Ymd\THis\Z'),
                'details' => $details,
                'location' => $this->meetLink ?? '',
            ]),
            'Outlook' => 'https://outlook.live.com/calendar/0/action/compose?'.http_build_query([
                'rru' => 'addevent',
                'subject' => $title,
                'startdt' => $start->format('Y-m-d\TH:i:s\Z'),
                'enddt' => $end->format('Y-m-d\TH:i:s\Z'),
                'body' => $details,
                'location' => $this->meetLink ?? '',
            ]),
        ];
    }
}

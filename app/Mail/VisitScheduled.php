<?php

declare(strict_types=1);

namespace App\Mail;

use App\Models\Visit;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Attachment;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Confirmation de visite au client, dans sa langue, avec l'adresse du bien,
 * l'invitation ICS jointe et les liens « ajouter à l'agenda ». Charte du site RIP.
 */
final class VisitScheduled extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public const int DURATION_MINUTES = 30;

    public function __construct(
        public readonly Visit $visit,
        private readonly string $ics,
    ) {}

    public function envelope(): Envelope
    {
        $fr = app()->getLocale() !== 'en';
        $when = LeadVisioScheduled::dateText($this->visit->scheduled_at->toImmutable(), $fr);

        return new Envelope(subject: $fr ? "Votre visite est confirmée : {$when}" : "Your viewing is confirmed: {$when}");
    }

    public function content(): Content
    {
        $fr = app()->getLocale() !== 'en';
        $this->visit->loadMissing(['lead.assignee', 'property', 'agent.agency']);
        $at = $this->visit->scheduled_at->toImmutable();

        return new Content(view: 'emails.visits.scheduled', with: [
            'lead' => $this->visit->lead,
            'property' => $this->visit->property,
            'fr' => $fr,
            'dateBig' => $at->settings(['locale' => $fr ? 'fr' : 'en'])->translatedFormat('l j F'),
            'timeBig' => $at->format($fr ? 'H\hi' : 'H:i'),
            'address' => self::address($this->visit),
            'agentName' => $this->visit->agent?->fullName(),
            'agencyName' => $this->visit->agent?->agency?->name,
            'advisorName' => $this->visit->lead->assignee?->name,
            'calendarLinks' => $this->calendarLinks($fr),
            'mail' => config('company.mail'),
        ]);
    }

    /**
     * @return list<Attachment>
     */
    public function attachments(): array
    {
        return [Attachment::fromData(fn (): string => $this->ics, 'visite.ics')->withMime('text/calendar')];
    }

    /** Adresse du bien sur une ligne : « 12 rue Oberkampf, 75011 Paris ». */
    public static function address(Visit $visit): string
    {
        $property = $visit->property;
        $line = trim(implode(' ', array_filter([$property->postal_code, $property->city])));

        return implode(', ', array_filter([$property->street, $line]));
    }

    /**
     * @return array<string, string>
     */
    private function calendarLinks(bool $fr): array
    {
        $title = $fr ? 'Visite : '.$this->visit->property->label() : 'Viewing: '.$this->visit->property->label();
        $details = ($fr ? 'Visite du logement avec Relocation in Paris.' : 'Home viewing with Relocation in Paris.');
        $start = $this->visit->scheduled_at->toImmutable()->setTimezone('UTC');
        $end = $start->addMinutes(self::DURATION_MINUTES);
        $location = self::address($this->visit);

        return [
            'Google Calendar' => 'https://calendar.google.com/calendar/render?'.http_build_query([
                'action' => 'TEMPLATE',
                'text' => $title,
                'dates' => $start->format('Ymd\THis\Z').'/'.$end->format('Ymd\THis\Z'),
                'details' => $details,
                'location' => $location,
            ]),
            'Outlook' => 'https://outlook.live.com/calendar/0/action/compose?'.http_build_query([
                'rru' => 'addevent',
                'subject' => $title,
                'startdt' => $start->format('Y-m-d\TH:i:s\Z'),
                'enddt' => $end->format('Y-m-d\TH:i:s\Z'),
                'body' => $details,
                'location' => $location,
            ]),
        ];
    }
}

<?php

declare(strict_types=1);

namespace App\Mail;

use App\Actions\Visits\SubmitVisitReport;
use App\Models\Visit;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Attachment;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;

/**
 * Compte rendu de visite envoyé au client, dans sa langue : ce que l'équipe a
 * vu sur place, le bien concerné, et les premières photos en pièces jointes.
 */
final class VisitReportSent extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    /** Au-delà, l'e-mail devient trop lourd : les autres photos restent dans le dossier. */
    public const int MAX_PHOTOS = 4;

    public function __construct(public readonly Visit $visit) {}

    public function envelope(): Envelope
    {
        $fr = app()->getLocale() !== 'en';
        $when = $this->visit->scheduled_at
            ->settings(['locale' => $fr ? 'fr' : 'en'])
            ->translatedFormat($fr ? 'j F' : 'F j');

        return new Envelope(subject: $fr
            ? "Compte rendu de votre visite du {$when}"
            : "Report from your viewing on {$when}");
    }

    public function content(): Content
    {
        $fr = app()->getLocale() !== 'en';
        $this->visit->loadMissing(['lead.assignee', 'property', 'agent']);
        $at = $this->visit->scheduled_at->toImmutable();

        return new Content(view: 'emails.visits.report', with: [
            'fr' => $fr,
            'lead' => $this->visit->lead,
            'property' => $this->visit->property,
            'report' => $this->visit->report,
            'when' => $at->settings(['locale' => $fr ? 'fr' : 'en'])->translatedFormat($fr ? 'l j F Y' : 'l F j, Y'),
            'time' => $at->format($fr ? 'H\hi' : 'H:i'),
            'address' => VisitScheduled::address($this->visit),
            'advisorName' => $this->visit->lead->assignee?->name,
            'photoCount' => count($this->visit->report_photos ?? []),
            'attachedCount' => min(count($this->visit->report_photos ?? []), self::MAX_PHOTOS),
        ]);
    }

    /**
     * Les premières photos du compte rendu, lues sur le disque (le client n'a
     * pas de compte : il ne peut pas suivre un lien signé du backoffice).
     *
     * @return list<Attachment>
     */
    public function attachments(): array
    {
        $paths = array_slice($this->visit->report_photos ?? [], 0, self::MAX_PHOTOS);

        return array_map(
            fn (string $path, int $index): Attachment => Attachment::fromData(
                fn (): string => (string) Storage::disk(SubmitVisitReport::DISK)->get($path),
                'photo-'.($index + 1).'.'.(pathinfo($path, PATHINFO_EXTENSION) ?: 'jpg'),
            ),
            $paths,
            array_keys($paths),
        );
    }
}

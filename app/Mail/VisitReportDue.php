<?php

declare(strict_types=1);

namespace App\Mail;

use App\Models\Visit;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Rappel au membre qui a réalisé une visite : le compte rendu est attendu.
 */
final class VisitReportDue extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public readonly Visit $visit) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: "Compte rendu à rédiger : visite de {$this->visit->lead->fullName()}");
    }

    public function content(): Content
    {
        return new Content(view: 'emails.visits.report-due', with: [
            'visit' => $this->visit,
            'assignee' => $this->visit->assignee,
            'client' => $this->visit->lead,
            'property' => $this->visit->property,
            'when' => $this->visit->scheduled_at->timezone('Europe/Paris')->translatedFormat('l j F Y \à H\hi'),
            'url' => route('clients.visits', ['report' => $this->visit->uuid]),
            'mail' => config('company.mail'),
        ]);
    }
}

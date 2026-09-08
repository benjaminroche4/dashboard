<?php

declare(strict_types=1);

namespace App\Mail;

use App\Models\Lead;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Rappel au conseiller après l'appel vidéo avec un lead : le compte rendu est attendu.
 */
final class VisioReportDue extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public readonly Lead $lead) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: "Compte rendu à rédiger : appel vidéo avec {$this->lead->fullName()}");
    }

    public function content(): Content
    {
        return new Content(view: 'emails.leads.visio-report-due', with: [
            'lead' => $this->lead,
            'assignee' => $this->lead->assignee,
            'when' => $this->lead->visio_at?->timezone('Europe/Paris')->translatedFormat('l j F Y \à H\hi') ?? '',
            'url' => route('leads.show', ['lead' => $this->lead, 'report' => 'visio']),
            'mail' => config('company.mail'),
        ]);
    }
}

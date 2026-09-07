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
 * Alerte à l'adresse de contact : un nouveau lead attend depuis 30 minutes sans premier contact.
 */
final class FirstContactOverdue extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Lead $lead,
        public readonly int $minutes,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: "⏱ {$this->lead->fullName()} attend depuis {$this->minutes} min sans contact");
    }

    public function content(): Content
    {
        return new Content(view: 'emails.leads.first-contact-overdue', with: [
            'lead' => $this->lead,
            'minutes' => $this->minutes,
            'mail' => config('company.mail'),
        ]);
    }
}

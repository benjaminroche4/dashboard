<?php

declare(strict_types=1);

namespace App\Mail;

use App\Models\Lead;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Str;

/**
 * Alerte au conseiller responsable : le lead qui lui est attribué attend depuis 30 minutes sans premier contact.
 */
final class FirstContactOverdueForAssignee extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Lead $lead,
        public readonly User $assignee,
        public readonly int $minutes,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: "⏱ {$this->lead->fullName()} vous attend depuis {$this->minutes} min sans contact");
    }

    public function content(): Content
    {
        return new Content(view: 'emails.leads.first-contact-overdue-assignee', with: [
            'lead' => $this->lead,
            'assignee' => $this->assignee,
            'firstName' => Str::before(trim($this->assignee->name), ' '),
            'minutes' => $this->minutes,
            'mail' => config('company.mail'),
        ]);
    }
}

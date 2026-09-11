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
use Illuminate\Support\Collection;

/**
 * Rappel matinal au conseiller : ses recontacts du jour et en retard.
 */
final class RecontactsDue extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    /**
     * @param  Collection<int, Lead>  $leads
     */
    public function __construct(
        public readonly User $assignee,
        public readonly Collection $leads,
    ) {}

    public function envelope(): Envelope
    {
        $count = $this->leads->count();

        return new Envelope(subject: $count > 1 ? "{$count} recontacts à faire aujourd'hui" : 'Un recontact à faire aujourd\'hui');
    }

    public function content(): Content
    {
        return new Content(view: 'emails.leads.recontacts', with: [
            'assignee' => $this->assignee,
            'leads' => $this->leads,
            'today' => today(),
            'mail' => config('company.mail'),
        ]);
    }
}

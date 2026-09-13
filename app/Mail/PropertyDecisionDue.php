<?php

declare(strict_types=1);

namespace App\Mail;

use App\Models\Lead;
use App\Models\Property;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Relance interne : un bien visité attend toujours la décision du client.
 * Adressée aux personnes de suivi du dossier, jamais au client.
 */
final class PropertyDecisionDue extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Lead $lead,
        public readonly Property $property,
        private readonly User $member,
        private readonly int $days,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: "Décision attendue : {$this->property->label()} pour {$this->lead->householdName()}");
    }

    public function content(): Content
    {
        return new Content(view: 'emails.clients.property-decision-due', with: [
            'member' => $this->member,
            'client' => $this->lead,
            'property' => $this->property,
            'days' => $this->days,
            'url' => route('clients.show', ['lead' => $this->lead->uuid]).'#biens',
            'mail' => config('company.mail'),
        ]);
    }
}

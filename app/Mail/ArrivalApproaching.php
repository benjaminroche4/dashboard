<?php

declare(strict_types=1);

namespace App\Mail;

use App\Models\Lead;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Alerte aux personnes de suivi d'un dossier : l'installation du client
 * approche (J-15, J-7, J-3). E-mail interne, toujours en français.
 */
final class ArrivalApproaching extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public readonly Lead $client, public readonly int $days) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: "J-{$this->days} : installation de {$this->client->householdName()}");
    }

    public function content(): Content
    {
        $this->client->loadMissing(['assignee', 'coAssignee']);

        return new Content(view: 'emails.clients.arrival-approaching', with: [
            'client' => $this->client,
            'days' => $this->days,
            'arrival' => $this->client->arrival_at?->translatedFormat('l j F Y'),
            'url' => route('clients.show', $this->client),
            'mail' => config('company.mail'),
        ]);
    }
}

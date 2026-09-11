<?php

declare(strict_types=1);

namespace App\Mail;

use App\Models\Lead;
use App\Models\LeadPartner;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Dossier d'un client transmis à un partenaire (assureur, garant, déménageur…) :
 * récapitulatif du projet et coordonnées du conseiller.
 */
final class LeadDossierForwarded extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Lead $lead,
        public readonly LeadPartner $link,
        public readonly ?string $message = null,
        public readonly ?User $sender = null,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: "Dossier {$this->lead->fullName()} · {$this->link->role->label()}");
    }

    public function content(): Content
    {
        $lead = $this->lead;
        $districts = array_map(intval(...), $lead->districts ?? []);
        sort($districts);

        return new Content(view: 'emails.partners.dossier', with: [
            'lead' => $lead,
            'link' => $this->link,
            'partner' => $this->link->partner,
            'intro' => $this->message,
            'sender' => $this->sender,
            'budget' => $lead->budget_cents === null ? null : number_format($lead->budget_cents / 100, 0, ',', ' ').' '.$lead->currency->value.'/mois',
            'moveIn' => $lead->arrival_at?->timezone('Europe/Paris')->translatedFormat('j F Y'),
            'districts' => $districts === [] ? null : implode(', ', array_map(fn (int $d): string => $d === 1 ? '1er' : "{$d}e", $districts)),
            'propertyTypes' => $lead->property_types?->map(fn ($type): string => $type->label())->implode(', '),
            'mail' => config('company.mail'),
        ]);
    }
}

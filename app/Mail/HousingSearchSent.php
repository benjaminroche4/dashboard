<?php

declare(strict_types=1);

namespace App\Mail;

use App\Models\Agency;
use App\Models\Agent;
use App\Models\Lead;
use App\Models\User;
use App\Support\HousingSearchFacts;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Recherche d'un client envoyée à une agence immobilière : le projet et le mot
 * du conseiller, sans les coordonnées du client.
 */
final class HousingSearchSent extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Lead $lead,
        public readonly ?Agency $agency,
        public readonly ?Agent $agent,
        public readonly string $message,
        public readonly User $sender,
    ) {}

    public function envelope(): Envelope
    {
        $districts = array_map(intval(...), $this->lead->districts ?? []);
        sort($districts);
        $where = $districts === [] ? 'Paris' : 'Paris '.implode(', ', array_map(fn (int $d): string => $d === 1 ? '1er' : "{$d}e", $districts));
        $what = $this->lead->property_types?->map(fn ($type): string => $type->label())->implode(' / ') ?: 'logement';

        return new Envelope(subject: "Recherche {$what} · {$where} · Relocation in Paris");
    }

    public function content(): Content
    {
        return new Content(view: 'emails.agencies.search', with: [
            'lead' => $this->lead,
            'agency' => $this->agency,
            'agent' => $this->agent,
            'intro' => $this->message,
            'sender' => $this->sender,
            'rows' => HousingSearchFacts::for($this->lead),
            'mail' => config('company.mail'),
        ]);
    }
}

<?php

declare(strict_types=1);

namespace App\Mail;

use App\Actions\Leads\ScheduleLeadVisio;
use App\Models\Lead;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * « 4 biens correspondent à votre recherche » : e-mail indépendant au lead,
 * dans sa langue, qui lui dit combien de biens de la base correspondent à
 * son projet (rien d'autre sur les biens) et l'invite à contacter son
 * conseiller pour les visiter. Charte du site RIP.
 */
final class LeadPropertyMatch extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Lead $lead,
        public readonly int $count,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->subjectLine(app()->getLocale() !== 'en'));
    }

    /** Prénom en tête, le chiffre qui attire, pas de marque. */
    public function subjectLine(bool $fr): string
    {
        $name = $this->lead->first_name;
        $count = $this->countText($fr);

        return $fr
            ? "{$name}, {$count} à votre recherche à Paris"
            : "{$name}, {$count} your search in Paris";
    }

    /** « 4 biens correspondent » / « un bien correspond », accordé. */
    public function countText(bool $fr): string
    {
        $n = $this->count;

        if ($fr) {
            return $n === 1 ? 'un bien correspond' : "{$n} biens correspondent";
        }

        return $n === 1 ? 'one home matches' : "{$n} homes match";
    }

    public function preheader(bool $fr): string
    {
        return $fr
            ? 'Ils sont dans notre base, pas encore en ligne. Un message à votre conseiller suffit pour les visiter.'
            : 'They are in our database, not online yet. One message to your advisor is all it takes to visit them.';
    }

    public function content(): Content
    {
        $fr = app()->getLocale() !== 'en';
        $this->lead->loadMissing('assignee');
        $advisor = $this->lead->assignee;
        $replyTo = $advisor !== null ? $advisor->email : (string) config('mail.from.address');

        return new Content(view: 'emails.leads.property-match', with: [
            'lead' => $this->lead,
            'fr' => $fr,
            'locale' => $fr ? 'fr' : 'en',
            'preheader' => $this->preheader($fr),
            'count' => $this->count,
            'countText' => $this->countText($fr),
            'advisorName' => ScheduleLeadVisio::advisorFirstName($this->lead),
            'advisorPhone' => $advisor?->phone,
            'ctaUrl' => 'mailto:'.$replyTo.'?subject='.rawurlencode($fr
                ? 'Je veux visiter les biens qui correspondent à ma recherche'
                : 'I want to visit the homes matching my search'),
        ]);
    }
}

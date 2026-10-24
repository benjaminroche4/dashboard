<?php

declare(strict_types=1);

namespace App\Mail;

use App\Models\Company;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Str;

/**
 * E-mail de suivi à une entreprise de l'annuaire (relance, point d'étape,
 * remerciement) : objet et message libres, rédigés par le conseiller, dans la
 * charte des e-mails de Relocation in Paris.
 */
final class CompanyFollowUp extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Company $company,
        /** La personne à qui l'e-mail s'adresse (contact ou entreprise). */
        public readonly string $recipientName,
        public readonly string $subjectLine,
        public readonly string $message,
        public readonly ?User $sender = null,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->subjectLine);
    }

    public function content(): Content
    {
        return new Content(view: 'emails.companies.follow-up', with: [
            'company' => $this->company,
            'recipientName' => $this->recipientName,
            'subjectLine' => $this->subjectLine,
            // Un paragraphe par bloc séparé d'une ligne vide.
            'paragraphs' => $this->paragraphs(),
            'preheader' => Str::limit(trim(preg_replace('/\s+/', ' ', $this->message) ?? ''), 110),
            'sender' => $this->sender,
            'mail' => config('company.mail'),
        ]);
    }

    /**
     * @return list<string>
     */
    public function paragraphs(): array
    {
        $blocks = preg_split("/\n\s*\n/", str_replace("\r\n", "\n", trim($this->message))) ?: [];

        return array_values(array_filter(array_map(trim(...), $blocks), fn (string $block): bool => $block !== ''));
    }
}

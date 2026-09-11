<?php

declare(strict_types=1);

namespace App\Mail;

use App\Models\Quote;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Attachment;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * E-mail au client avec le devis en pièce jointe (PDF si disponible).
 */
final class QuoteSent extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Quote $quote,
        private readonly ?string $pdf = null,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: "Devis {$this->quote->number} · ".config('company.name'));
    }

    public function content(): Content
    {
        return new Content(view: 'emails.quotes.sent', with: [
            'quote' => $this->quote,
            'company' => config('company'),
        ]);
    }

    /**
     * @return list<Attachment>
     */
    public function attachments(): array
    {
        if ($this->pdf === null) {
            return [];
        }

        return [
            Attachment::fromData(fn (): string => $this->pdf, "devis-{$this->quote->number}.pdf")
                ->withMime('application/pdf'),
        ];
    }
}

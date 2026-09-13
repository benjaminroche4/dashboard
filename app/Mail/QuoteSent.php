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

    /** PDF encodé en base64, pour traverser la file sans casser son payload. */
    private readonly ?string $pdf;

    public function __construct(
        public readonly Quote $quote,
        ?string $pdf = null,
    ) {
        // Le mailable part en file (`ShouldQueue`) et son payload est encodé
        // en JSON, qui refuse les octets bruts d'un PDF (« Malformed UTF-8
        // characters » à la mise en file, donc une 500 à l'envoi). On garde
        // donc le fichier en base64 et on le décode au moment de le joindre.
        $this->pdf = $pdf === null ? null : base64_encode($pdf);
    }

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
            Attachment::fromData(fn (): string => base64_decode($this->pdf, true) ?: '', "devis-{$this->quote->number}.pdf")
                ->withMime('application/pdf'),
        ];
    }
}

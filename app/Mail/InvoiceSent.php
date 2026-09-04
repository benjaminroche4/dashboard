<?php

declare(strict_types=1);

namespace App\Mail;

use App\Models\Invoice;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Attachment;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * E-mail au client avec la facture en pièce jointe (PDF si disponible).
 */
final class InvoiceSent extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Invoice $invoice,
        private readonly ?string $pdf = null,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: "Facture {$this->invoice->number} · ".config('company.name'));
    }

    public function content(): Content
    {
        return new Content(view: 'emails.invoices.sent', with: [
            'invoice' => $this->invoice,
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
            Attachment::fromData(fn (): string => $this->pdf, "facture-{$this->invoice->number}.pdf")
                ->withMime('application/pdf'),
        ];
    }
}

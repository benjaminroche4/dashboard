<?php

declare(strict_types=1);

namespace App\Actions\Invoices;

use App\Enums\InvoiceStatus;
use App\Events\DashboardUpdated;
use App\Mail\InvoiceSent;
use App\Models\Invoice;
use App\Models\User;
use App\Services\DocRaptor;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

/**
 * Envoie la facture au client (e-mail, PDF joint si DocRaptor est configuré)
 * et la passe au statut « envoyée ».
 */
final readonly class SendInvoice
{
    public function __construct(private DocRaptor $docRaptor) {}

    /**
     * @return bool Vrai si un PDF a été joint.
     *
     * @throws ValidationException si la facture n'est pas envoyable
     */
    public function handle(Invoice $invoice, ?User $by = null): bool
    {
        if (! $invoice->status->canTransitionTo(InvoiceStatus::Sent)) {
            throw ValidationException::withMessages(['status' => __('Cette facture ne peut pas être envoyée depuis le statut « :status ».', ['status' => $invoice->status->label()])]);
        }

        if ($invoice->client_email === null || $invoice->client_email === '') {
            throw ValidationException::withMessages(['client_email' => __('Ajoutez un e-mail client avant d\'envoyer la facture.')]);
        }

        $pdf = null;

        if ($this->docRaptor->isConfigured()) {
            $html = view('invoices.pdf', [
                'invoice' => $invoice,
                'company' => config('company'),
                'logo' => self::logoDataUri(),
            ])->render();

            $pdf = $this->docRaptor->pdf($html, "facture-{$invoice->number}.pdf");
        }

        // Un dossier peut compter deux locataires : le second reçoit la même
        // facture en copie, sans jamais doubler le destinataire principal.
        $copies = $invoice->lead === null ? [] : array_values(array_filter(
            $invoice->lead->mailRecipients(),
            fn (array $recipient): bool => strcasecmp($recipient['email'], (string) $invoice->client_email) !== 0,
        ));

        Mail::to($invoice->client_email, $invoice->client_name)
            ->cc($copies)
            ->send(new InvoiceSent($invoice, $pdf));

        $invoice->sent_at = now();
        $invoice->transitionTo(InvoiceStatus::Sent, $by, 'Envoyée à '.$invoice->client_email);

        event(new DashboardUpdated('invoices', ['id' => $invoice->id], "a envoyé la facture {$invoice->number}"));

        return $pdf !== null;
    }

    /**
     * Logo embarqué en data URI pour le PDF (DocRaptor ne lit pas nos fichiers locaux).
     */
    public static function logoDataUri(): ?string
    {
        $path = public_path('images/logo.jpg');

        if (! is_file($path)) {
            return null;
        }

        return 'data:image/jpeg;base64,'.base64_encode((string) file_get_contents($path));
    }
}

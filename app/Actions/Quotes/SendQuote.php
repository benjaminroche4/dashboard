<?php

declare(strict_types=1);

namespace App\Actions\Quotes;

use App\Enums\QuoteStatus;
use App\Events\DashboardUpdated;
use App\Mail\QuoteSent;
use App\Models\Quote;
use App\Models\User;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

/**
 * Envoie le devis au client (e-mail, PDF joint si DocRaptor est configuré),
 * le passe en « envoyé » et le journalise sur le lead rattaché.
 */
final readonly class SendQuote
{
    public function __construct(private RenderQuotePdf $renderPdf) {}

    /**
     * @return bool Vrai si un PDF a été joint.
     *
     * @throws ValidationException si le devis n'est pas envoyable
     */
    public function handle(Quote $quote, ?User $by = null): bool
    {
        if (! $quote->status->canTransitionTo(QuoteStatus::Sent)) {
            throw ValidationException::withMessages(['status' => __('Ce devis ne peut pas être envoyé depuis le statut « :status ».', ['status' => $quote->status->label()])]);
        }

        if ($quote->client_email === null || $quote->client_email === '') {
            throw ValidationException::withMessages(['client_email' => __('Ajoutez un e-mail client avant d\'envoyer le devis.')]);
        }

        $pdf = $this->renderPdf->handle($quote);

        Mail::to($quote->client_email, $quote->client_name)->send(new QuoteSent($quote, $pdf));

        $quote->sent_at = now();
        $quote->transitionTo(QuoteStatus::Sent, $by, 'Envoyé à '.$quote->client_email);

        if ($quote->lead !== null) {
            $quote->lead->notes()->create(['body' => "Devis {$quote->number} envoyé à {$quote->client_email}.", 'user_id' => $by?->id]);
            $quote->lead->forceFill(['last_contacted_at' => now()])->save();
        }

        event(new DashboardUpdated('quotes', ['id' => $quote->id, 'lead_id' => $quote->lead_id], "a envoyé le devis {$quote->number}"));

        return $pdf !== null;
    }
}

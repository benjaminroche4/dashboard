<?php

declare(strict_types=1);

namespace App\Actions\Documents;

use App\Events\DashboardUpdated;
use App\Mail\DocumentUploadLinkSent;
use App\Models\DocumentRequest;
use App\Models\User;
use Illuminate\Support\Facades\Mail;

/**
 * Envoie au client l'e-mail avec le lien public de dépôt et le code
 * d'appairage, dans la langue de la liste, et le journalise.
 */
final class SendDocumentUploadLink
{
    /**
     * @param  list<string>  $emails  un seul envoi, tous les destinataires en « À »
     */
    public function handle(DocumentRequest $request, array $emails, ?User $by = null): DocumentRequest
    {
        $recipients = array_values(array_unique(array_filter($emails)));

        Mail::to($recipients)
            ->locale($request->language->value)
            ->send(new DocumentUploadLinkSent($request));

        $sentTo = implode(', ', $recipients);
        $request->forceFill(['link_sent_to' => $sentTo, 'link_sent_at' => now()])->save();

        if ($request->lead !== null) {
            $request->lead->notes()->create(['body' => "Lien de dépôt des pièces envoyé à {$sentTo}.", 'user_id' => $by?->id]);
            $request->lead->forceFill(['last_contacted_at' => now()])->save();
        }

        event(new DashboardUpdated('documents', ['id' => $request->id, 'lead_id' => $request->lead_id], 'a envoyé le lien de dépôt des pièces à '.$request->fullName()));

        return $request;
    }
}

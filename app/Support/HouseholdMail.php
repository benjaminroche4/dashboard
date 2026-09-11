<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\Lead;
use App\Models\User;
use Illuminate\Mail\Mailable;
use Illuminate\Support\Facades\Mail;

/**
 * Envoi d'un e-mail au foyer d'un dossier : les deux locataires en
 * destinataires, les membres qui suivent le dossier en copie, dans la langue
 * du client.
 */
final class HouseholdMail
{
    /**
     * @return list<string> Adresses réellement destinataires
     */
    public static function send(Lead $lead, Mailable $mailable): array
    {
        $recipients = $lead->mailRecipients();

        if ($recipients === []) {
            return [];
        }

        $pending = Mail::to($recipients);
        $copies = array_map(
            fn (User $member): array => ['email' => $member->email, 'name' => $member->name],
            $lead->followers(),
        );

        if ($copies !== []) {
            $pending->cc($copies);
        }

        $pending->locale($lead->language->value)->send($mailable);

        return array_map(fn (array $recipient): string => $recipient['email'], $recipients);
    }
}

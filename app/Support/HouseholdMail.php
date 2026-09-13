<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\Lead;
use App\Models\LeadWatcher;
use App\Models\User;
use Illuminate\Mail\Mailable;
use Illuminate\Support\Facades\Mail;

/**
 * Envoi d'un e-mail au foyer d'un dossier : les deux locataires en
 * destinataires, les membres qui suivent le dossier et ses personnes de suivi
 * en copie, dans la langue du client.
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
        // En copie : les membres qui suivent le dossier, et les personnes de
        // suivi que l'équipe y a ajoutées (un parent, un contact RH…).
        $copies = [
            ...array_map(
                fn (User $member): array => ['email' => $member->email, 'name' => $member->name],
                $lead->followers(),
            ),
            ...$lead->watchers->map(
                fn (LeadWatcher $watcher): array => ['email' => $watcher->email, 'name' => $watcher->name],
            )->all(),
        ];

        if ($copies !== []) {
            $pending->cc($copies);
        }

        $pending->locale($lead->language->value)->send($mailable);

        return array_map(fn (array $recipient): string => $recipient['email'], $recipients);
    }
}

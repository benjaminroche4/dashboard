<?php

declare(strict_types=1);

namespace App\Actions\Directory;

use App\Actions\Leads\SendLeadDossier;
use App\Mail\DirectoryWelcome;
use App\Models\User;
use Illuminate\Support\Facades\Mail;

/**
 * E-mail de bienvenue à un contact qui rejoint l'annuaire (partenaire, agence,
 * agent) : envoyé au nom du conseiller si son domaine est vérifié, réponses vers lui.
 */
final class SendDirectoryWelcome
{
    public function handle(string $email, string $name, string $category, ?string $phone = null, ?User $by = null): void
    {
        $mailable = new DirectoryWelcome($name, $category, $email, $phone, $by);

        if ($by instanceof User) {
            $fromAddress = SendLeadDossier::canSendAs($by->email) ? $by->email : (string) config('mail.from.address');

            if ($fromAddress !== '') {
                $mailable->from($fromAddress, "{$by->name} · ".config('mail.from.name'));
            }

            $mailable->replyTo($by->email, $by->name);
        }

        Mail::to($email, $name)->locale('fr')->send($mailable);
    }
}

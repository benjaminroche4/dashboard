<?php

declare(strict_types=1);

namespace App\Actions\Companies;

use App\Actions\Leads\SendLeadDossier;
use App\Events\DashboardUpdated;
use App\Mail\CompanyFollowUp;
use App\Models\Company;
use App\Models\User;
use Illuminate\Support\Facades\Mail;

/**
 * Envoie un e-mail de suivi libre à une entreprise : un e-mail par personne,
 * adressé à son nom, au nom du conseiller si son domaine est vérifié,
 * réponses vers lui. Le journal garde la trace de l'envoi.
 */
final class SendCompanyFollowUp
{
    /**
     * @param  list<array{email: string, name: string}>  $recipients
     */
    public function handle(Company $company, array $recipients, string $subject, string $message, ?User $by = null): void
    {
        foreach ($recipients as $recipient) {
            $mailable = new CompanyFollowUp($company, $recipient['name'], $subject, $message, $by);

            if ($by instanceof User) {
                $fromAddress = SendLeadDossier::canSendAs($by->email) ? $by->email : (string) config('mail.from.address');

                if ($fromAddress !== '') {
                    $mailable->from($fromAddress, "{$by->name} · ".config('mail.from.name'));
                }

                $mailable->replyTo($by->email, $by->name);
            }

            Mail::to($recipient['email'], $recipient['name'])->locale('fr')->send($mailable);
        }

        $names = implode(', ', array_column($recipients, 'name'));

        event(new DashboardUpdated('companies', ['id' => $company->id, 'subject' => $subject], "a envoyé « {$subject} » à {$names} ({$company->name})", $by));
    }
}

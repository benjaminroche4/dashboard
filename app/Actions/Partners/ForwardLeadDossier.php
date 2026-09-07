<?php

declare(strict_types=1);

namespace App\Actions\Partners;

use App\Actions\Leads\SendLeadDossier;
use App\Events\DashboardUpdated;
use App\Mail\LeadDossierForwarded;
use App\Models\LeadPartner;
use App\Models\User;
use Illuminate\Support\Facades\Mail;

/**
 * Transmet le dossier d'un lead à un partenaire qui intervient dessus :
 * e-mail récapitulatif au destinataire choisi (le partenaire ou l'un de ses
 * interlocuteurs), journalisé en note du lead. Les réponses vont au conseiller.
 */
final class ForwardLeadDossier
{
    public function handle(LeadPartner $link, string $email, ?string $message = null, ?User $by = null): void
    {
        $lead = $link->lead;
        $partner = $link->partner;

        $mailable = new LeadDossierForwarded($lead, $link, $message, $by);

        if ($by instanceof User) {
            $fromAddress = SendLeadDossier::canSendAs($by->email) ? $by->email : (string) config('mail.from.address');

            if ($fromAddress !== '') {
                $mailable->from($fromAddress, "{$by->name} · ".config('mail.from.name'));
            }

            $mailable->replyTo($by->email, $by->name);
        }

        Mail::to($email, $partner->name)->locale('fr')->send($mailable);

        $lead->notes()->create(['body' => "Dossier transmis à {$partner->name} ({$link->role->label()}) : {$email}.", 'user_id' => $by?->id]);

        event(new DashboardUpdated('leads', ['id' => $lead->id], "a transmis le dossier {$lead->fullName()} à {$partner->name}"));
    }
}

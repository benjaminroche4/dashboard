<?php

declare(strict_types=1);

namespace App\Actions\Agencies;

use App\Actions\Leads\SendLeadDossier;
use App\Events\DashboardUpdated;
use App\Mail\HousingSearchSent;
use App\Models\Agency;
use App\Models\Agent;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Support\Facades\Mail;

/**
 * Envoie la recherche d'un client à une agence (ou à un agent) : le projet,
 * sans les coordonnées du client, avec le mot du conseiller. Les réponses vont
 * au conseiller. Journalisé en note du dossier ; l'échange est daté sur
 * l'agence et l'agent.
 */
final class SendHousingSearch
{
    public function handle(Lead $lead, ?Agency $agency, ?Agent $agent, string $email, string $message, User $by): void
    {
        $recipientName = $agent?->fullName() ?? ($agency instanceof Agency ? $agency->name : $email);
        $mailable = new HousingSearchSent($lead, $agency, $agent, $message, $by);

        $fromAddress = SendLeadDossier::canSendAs($by->email) ? $by->email : (string) config('mail.from.address');
        if ($fromAddress !== '') {
            $mailable->from($fromAddress, "{$by->name} · ".config('mail.from.name'));
        }
        $mailable->replyTo($by->email, $by->name);

        Mail::to($email, $recipientName)->locale('fr')->send($mailable);

        $now = now();
        foreach ([$agency, $agent] as $entry) {
            if ($entry !== null) {
                $entry->last_contacted_at = $now;
                $entry->save();
            }
        }

        $target = $agency instanceof Agency && $agent instanceof Agent ? "{$agency->name} ({$recipientName})" : $recipientName;
        $lead->notes()->create(['body' => "Recherche envoyée à {$target} : {$email}.", 'user_id' => $by->id]);

        event(new DashboardUpdated('clients', [
            'id' => $lead->id,
            'agency_id' => $agency?->id,
            'agent_id' => $agent?->id,
        ], "a envoyé la recherche de {$lead->householdName()} à {$target}", $by));
    }
}

<?php

declare(strict_types=1);

namespace App\Actions\Leads;

use App\Events\DashboardUpdated;
use App\Mail\LeadPropertyMatch;
use App\Models\Lead;
use App\Models\User;
use App\Support\HouseholdMail;
use Illuminate\Validation\ValidationException;

/**
 * Dit au lead, par un e-mail à part, combien de biens de la base
 * correspondent à sa recherche, et l'invite à contacter son conseiller
 * pour les visiter. L'envoi est journalisé dans les notes du lead.
 */
final readonly class SendLeadPropertyMatch
{
    /**
     * @throws ValidationException si le lead n'a pas d'e-mail
     */
    public function handle(Lead $lead, int $count, ?User $by = null): void
    {
        if ($lead->email === null || $lead->email === '') {
            throw ValidationException::withMessages(['email' => __('Ajoutez un e-mail au lead avant de lui écrire.')]);
        }

        if ($count < 1) {
            throw ValidationException::withMessages(['count' => __('Indiquez au moins un bien correspondant.')]);
        }

        $mailable = new LeadPropertyMatch($lead, $count);
        $assignee = $lead->assignee;

        // Même expéditeur que le dossier : le conseiller si son domaine est vérifié.
        if ($assignee !== null) {
            $fromAddress = SendLeadDossier::canSendAs($assignee->email) ? $assignee->email : (string) config('mail.from.address');

            if ($fromAddress !== '') {
                $mailable->from($fromAddress, "{$assignee->name} · ".config('mail.from.name'));
            }

            $mailable->replyTo($assignee->email, $assignee->name);
        }

        $sentTo = HouseholdMail::send($lead, $mailable);
        $what = $count === 1 ? 'un bien correspondant' : "{$count} biens correspondants";

        $lead->notes()->create([
            'body' => 'E-mail au lead ('.implode(', ', $sentTo)."), {$what} à sa recherche.",
            'user_id' => $by?->id,
        ]);
        $lead->forceFill(['last_contacted_at' => now()])->save();

        event(new DashboardUpdated('leads', ['id' => $lead->id], "a annoncé {$what} au lead {$lead->fullName()}"));
    }
}

<?php

declare(strict_types=1);

namespace App\Actions\Leads;

use App\Enums\LeadStatus;
use App\Events\DashboardUpdated;
use App\Mail\FirstContactOverdue;
use App\Mail\FirstContactOverdueForAssignee;
use App\Models\Lead;
use App\Models\User;
use App\Services\AlloSms;
use Illuminate\Support\Facades\Mail;

/**
 * Chaque minute : tout lead « À traiter » créé depuis plus de 30 minutes et jamais
 * contacté déclenche, une seule fois, une alerte e-mail à l'adresse de contact de l'équipe
 * et, s'il est attribué, un e-mail et un SMS (Allo) directement au conseiller responsable.
 */
final readonly class AlertFirstContactOverdue
{
    public function __construct(private AlloSms $sms) {}

    /**
     * @return int Nombre de leads signalés
     */
    public function handle(): int
    {
        $minutes = max(1, (int) config('company.first_contact.minutes', 30));
        $recipient = (string) config('company.first_contact.alert_email', '');

        if ($recipient === '') {
            return 0;
        }

        $leads = Lead::query()
            ->with('assignee')
            ->where('status', LeadStatus::Todo)
            ->whereNull('last_contacted_at')
            ->whereNull('first_contact_alerted_at')
            ->where('created_at', '<=', now()->subMinutes($minutes))
            ->oldest()
            ->get();

        foreach ($leads as $lead) {
            // Le drapeau est posé d'abord, par une mise à jour conditionnelle : deux
            // exécutions qui se chevauchent n'envoient jamais deux alertes.
            $claimed = Lead::query()->whereKey($lead->id)->whereNull('first_contact_alerted_at')->update(['first_contact_alerted_at' => now()]);

            if ($claimed === 0) {
                continue;
            }

            Mail::to($recipient)->send(new FirstContactOverdue($lead, $minutes));

            $assignee = $lead->assignee;

            if ($assignee instanceof User) {
                $this->alertAssignee($lead, $assignee, $minutes);
            }

            $mentions = $lead->assigned_to === null ? [] : [$lead->assigned_to];
            event(new DashboardUpdated(
                'leads',
                ['id' => $lead->id, 'mentions' => $mentions],
                "Lead {$lead->fullName()} sans contact depuis {$minutes} min : alerte envoyée à {$recipient}"
                    .($assignee instanceof User ? " et à {$assignee->name}" : ''),
            ));
        }

        return $leads->count();
    }

    /**
     * E-mail au conseiller, puis SMS court s'il a renseigné un téléphone et qu'Allo est configuré.
     */
    private function alertAssignee(Lead $lead, User $assignee, int $minutes): void
    {
        Mail::to($assignee->email)->send(new FirstContactOverdueForAssignee($lead, $assignee, $minutes));

        $phone = $assignee->phone;

        if ($phone === null || $phone === '' || ! $this->sms->configured()) {
            return;
        }

        $reference = $lead->reference === null ? '' : " ({$lead->reference})";
        $this->sms->send($phone, self::smsText($lead->fullName().$reference, $minutes, route('leads.show', $lead)));
    }

    public static function smsText(string $lead, int $minutes, string $url): string
    {
        return "Relocation in Paris : le lead {$lead} attend un premier contact depuis {$minutes} min. {$url}";
    }
}

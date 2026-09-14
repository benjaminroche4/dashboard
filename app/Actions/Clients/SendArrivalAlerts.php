<?php

declare(strict_types=1);

namespace App\Actions\Clients;

use App\Enums\LeadStatus;
use App\Events\DashboardUpdated;
use App\Mail\ArrivalApproaching;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Support\Facades\Mail;

/**
 * L'installation d'un client approche : à J-15, J-7 puis J-3, les personnes
 * de suivi du dossier reçoivent une alerte. Un palier n'est envoyé qu'une
 * fois (`leads.arrival_alerted_days`) — la commande tourne tous les jours.
 *
 * Un dossier sans personne de suivi n'est pas laissé de côté : l'alerte part
 * alors à l'adresse de contact de l'agence, sans quoi personne ne verrait
 * l'échéance arriver.
 */
final class SendArrivalAlerts
{
    /**
     * @return int Nombre d'alertes envoyées
     */
    public function handle(): int
    {
        $days = self::days();

        if ($days === []) {
            return 0;
        }

        $clients = Lead::query()
            ->with(['assignee', 'coAssignee'])
            ->where('status', LeadStatus::Converted)
            ->whereNotNull('arrival_at')
            // Le palier le plus lointain borne la recherche ; une arrivée
            // passée ne s'alerte plus.
            ->whereBetween('arrival_at', [today(), today()->addDays(max($days))])
            ->oldest('arrival_at')
            ->get();

        $sent = 0;

        foreach ($clients as $client) {
            $day = self::dueDay($client, $days);

            if ($day === null) {
                continue;
            }

            $followers = $client->followers();
            $recipients = $followers === []
                ? [(string) config('company.email')]
                : array_map(fn (User $follower): string => $follower->email, $followers);

            Mail::to($recipients)->send(new ArrivalApproaching($client, $day));

            $client->forceFill([
                'arrival_alerted_days' => [...($client->arrival_alerted_days ?? []), $day],
            ])->save();

            event(new DashboardUpdated(
                'clients',
                ['id' => $client->id, 'mentions' => array_map(fn (User $follower): int => $follower->id, $followers)],
                "Installation de {$client->householdName()} dans {$day} jour".($day > 1 ? 's' : '').' : à préparer',
            ));

            $sent++;
        }

        return $sent;
    }

    /**
     * Palier atteint et pas encore alerté, le plus proche d'abord : un dossier
     * créé tard (ou une commande qui n'a pas tourné) rattrape les paliers
     * manqués sans envoyer trois e-mails d'un coup.
     *
     * @param  list<int>  $days
     */
    public static function dueDay(Lead $client, array $days): ?int
    {
        if ($client->arrival_at === null) {
            return null;
        }

        $remaining = today()->diffInDays($client->arrival_at->startOfDay(), absolute: false);
        $already = $client->arrival_alerted_days ?? [];

        $reached = array_values(array_filter(
            $days,
            fn (int $day): bool => $remaining <= $day && ! in_array($day, $already, true),
        ));

        return $reached === [] ? null : min($reached);
    }

    /**
     * Paliers configurés, du plus lointain au plus proche.
     *
     * @return list<int>
     */
    public static function days(): array
    {
        /** @var list<int> $days */
        $days = config('company.arrival_alert.days', []);
        $days = array_values(array_unique(array_filter($days, fn (int $day): bool => $day > 0)));
        rsort($days);

        return $days;
    }
}

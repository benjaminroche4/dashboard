<?php

declare(strict_types=1);

namespace App\Actions\Clients;

use App\Events\DashboardUpdated;
use App\Mail\PropertyDecisionDue;
use App\Models\Lead;
use App\Models\LeadPropertyLink;
use App\Models\Property;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\Mail;

/**
 * Un bien visité que le client laisse « À décider » : les personnes de suivi
 * du dossier sont relancées, puis de nouveau tous les `delay_hours` tant que
 * rien n'est tranché. Un bien qui plaît part vite : la relance est courte par
 * construction, et s'arrête dès que le statut change.
 */
final class SendPropertyDecisionReminders
{
    /**
     * @return int Nombre de rappels envoyés
     */
    public function handle(): int
    {
        $hours = self::hours();

        $links = LeadPropertyLink::query()
            ->awaitingDecision($hours)
            ->orderBy('id')
            ->get();

        $sent = 0;

        foreach ($links as $link) {
            $lead = Lead::query()->find($link->getAttribute('lead_id'));
            $property = Property::query()->find($link->getAttribute('property_id'));

            if (! $lead instanceof Lead || ! $property instanceof Property) {
                continue;
            }

            $followers = $lead->followers();

            if ($followers === []) {
                continue;
            }

            // Depuis quand la décision se fait attendre, en jours pleins.
            $days = max(1, (int) floor($hours / 24));
            $visited = $lead->visits()
                ->where('property_id', $property->id)
                ->latest('scheduled_at')
                ->value('scheduled_at');

            if ($visited !== null) {
                $days = max(1, (int) $visited->diffInDays(now()));
            }

            foreach ($followers as $member) {
                Mail::to($member->email, $member->name)->send(new PropertyDecisionDue($lead, $property, $member, $days));
            }

            $link->forceFill(['decision_reminded_at' => now()])->save();

            event(new DashboardUpdated(
                'clients',
                [
                    'id' => $lead->id,
                    'mentions' => array_map(fn (User $member): int => $member->id, $followers),
                ],
                "attend toujours la décision de {$lead->householdName()} sur le bien {$property->label()} ({$days} j)",
            ));
            $sent++;
        }

        return $sent;
    }

    /** Délai avant la première relance, et entre deux relances. */
    public static function hours(): int
    {
        return max(1, (int) config('company.property_decision.delay_hours'));
    }

    /**
     * Quand part la prochaine relance sur un bien laissé « à décider ». Même
     * règle que `awaitingDecision()` : la première court depuis la visite, les
     * suivantes depuis le dernier rappel. `null` sans visite effectuée —
     * il n'y a alors rien à relancer.
     */
    public static function nextReminderAt(?CarbonInterface $visitedAt, ?CarbonInterface $remindedAt): ?CarbonInterface
    {
        if (! $visitedAt instanceof CarbonInterface) {
            return null;
        }

        return ($remindedAt ?? $visitedAt)->copy()->addHours(self::hours());
    }
}

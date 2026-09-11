<?php

declare(strict_types=1);

namespace App\Actions\Reports;

use App\Enums\VisitStatus;
use App\Models\Lead;
use App\Models\User;
use App\Models\Visit;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

/**
 * Chiffres du rapport : leads reçus et visites réservées, sur la période choisie.
 *
 * Tout suit la période : le découpage des courbes (heure, jour, semaine ou mois
 * selon sa longueur), la comparaison avec la période précédente de même durée,
 * et le décompte des visites par membre.
 */
final class BuildReport
{
    /**
     * @return array<string, mixed>
     */
    public function handle(CarbonInterface $from, CarbonInterface $to): array
    {
        $start = $from->copy()->startOfDay();
        $end = $to->copy()->endOfDay();
        $buckets = self::buckets($start, $end);

        return [
            'period' => ['from' => $start->toDateString(), 'to' => $to->copy()->toDateString()],
            'granularity' => self::granularity($start, $end),
            'leads' => $this->leads($start, $end, $buckets),
            'visits' => $this->visits($start, $end, $buckets),
        ];
    }

    /**
     * Pas de la courbe selon la longueur de la période : deux jours se lisent
     * heure par heure, deux mois jour par jour, un semestre semaine par semaine,
     * au-delà mois par mois.
     */
    public static function granularity(CarbonInterface $from, CarbonInterface $to): string
    {
        $days = (int) $from->diffInDays($to) + 1;

        return match (true) {
            $days <= 2 => 'hour',
            $days <= 62 => 'day',
            $days <= 186 => 'week',
            default => 'month',
        };
    }

    /**
     * Tranches successives couvrant la période, avec leur libellé lisible.
     *
     * @return list<array{start: CarbonInterface, end: CarbonInterface, label: string}>
     */
    public static function buckets(CarbonInterface $from, CarbonInterface $to): array
    {
        $granularity = self::granularity($from, $to);
        $cursor = match ($granularity) {
            'hour' => $from->copy()->startOfHour(),
            'day' => $from->copy()->startOfDay(),
            'week' => $from->copy()->startOfWeek(),
            default => $from->copy()->startOfMonth(),
        };

        $buckets = [];

        while ($cursor->lessThanOrEqualTo($to)) {
            $next = match ($granularity) {
                'hour' => $cursor->copy()->addHour(),
                'day' => $cursor->copy()->addDay(),
                'week' => $cursor->copy()->addWeek(),
                default => $cursor->copy()->addMonth(),
            };

            $buckets[] = [
                'start' => $cursor->copy(),
                'end' => $next->copy()->subSecond(),
                'label' => match ($granularity) {
                    'hour' => $cursor->format('H\hi'),
                    'day' => $cursor->translatedFormat('j M'),
                    'week' => $cursor->translatedFormat('j M'),
                    default => ucfirst($cursor->translatedFormat('M Y')),
                },
            ];

            $cursor = $next;
        }

        return $buckets;
    }

    /**
     * Leads reçus sur la période, avec la courbe comparée à la période
     * précédente de même durée (tranche par tranche, dans le même ordre).
     *
     * @param  list<array{start: CarbonInterface, end: CarbonInterface, label: string}>  $buckets
     * @return array<string, mixed>
     */
    private function leads(CarbonInterface $from, CarbonInterface $to, array $buckets): array
    {
        // Carbon renvoie un flottant : la longueur de la période est ramenée à des secondes entières.
        $length = (int) $from->diffInSeconds($to);
        $previousEnd = $from->copy()->subSecond();
        $previousStart = $previousEnd->copy()->subSeconds($length);

        $current = $this->countByBucket(Lead::query()->whereBetween('created_at', [$from, $to])->pluck('created_at'), $buckets);
        $previous = $this->countByBucket(
            Lead::query()->whereBetween('created_at', [$previousStart, $previousEnd])->pluck('created_at'),
            $this->shift($buckets, -$length - 1),
        );

        $series = [];
        foreach ($buckets as $index => $bucket) {
            $series[] = [
                'label' => $bucket['label'],
                'current' => $current[$index],
                'previous' => $previous[$index] ?? 0,
            ];
        }

        return [
            'total' => array_sum($current),
            'previous_total' => array_sum($previous),
            'previous_label' => 'Du '.$previousStart->translatedFormat('j M Y').' au '.$previousEnd->translatedFormat('j M Y'),
            'series' => $series,
        ];
    }

    /**
     * Visites réservées (hors annulées) sur la période : total, courbe et
     * décompte par membre qui les a créées.
     *
     * @param  list<array{start: CarbonInterface, end: CarbonInterface, label: string}>  $buckets
     * @return array<string, mixed>
     */
    private function visits(CarbonInterface $from, CarbonInterface $to, array $buckets): array
    {
        $dates = Visit::query()
            ->where('status', '!=', VisitStatus::Cancelled)
            ->whereBetween('scheduled_at', [$from, $to])
            ->pluck('scheduled_at');

        $counts = $this->countByBucket($dates, $buckets);

        $series = [];
        foreach ($buckets as $index => $bucket) {
            $series[] = ['label' => $bucket['label'], 'count' => $counts[$index]];
        }

        return [
            'total' => $dates->count(),
            'series' => $series,
            'by_booker' => $this->visitsByBooker($from, $to),
        ];
    }

    /**
     * Qui a réservé les visites de la période : une ligne par membre (auteur de la
     * visite), du plus actif au moins actif, annulées comprises pour ne rien cacher.
     *
     * @return list<array{name: string, avatar: string|null, total: int, done: int, cancelled: int}>
     */
    private function visitsByBooker(CarbonInterface $from, CarbonInterface $to): array
    {
        $visits = Visit::query()
            ->whereBetween('scheduled_at', [$from, $to])
            ->get(['created_by', 'status']);

        /** @var array<int, array{name: string, avatar: string|null}> $members */
        $members = User::query()
            ->whereIn('id', $visits->pluck('created_by')->filter()->unique())
            ->get()
            ->mapWithKeys(fn (User $user): array => [$user->id => ['name' => $user->name, 'avatar' => $user->avatar]])
            ->all();

        $groups = $visits
            ->groupBy(fn (Visit $visit): string => $members[$visit->created_by]['name'] ?? 'Sans auteur')
            ->sortByDesc(fn (Collection $group): int => $group->count());

        $avatars = [];
        foreach ($members as $member) {
            $avatars[$member['name']] = $member['avatar'];
        }

        $rows = [];
        foreach ($groups as $name => $group) {
            $rows[] = [
                'name' => (string) $name,
                'avatar' => $avatars[$name] ?? null,
                'total' => $group->count(),
                'done' => $group->where('status', VisitStatus::Done)->count(),
                'cancelled' => $group->where('status', VisitStatus::Cancelled)->count(),
            ];
        }

        return $rows;
    }

    /**
     * Nombre de dates tombant dans chaque tranche, indexé comme les tranches.
     *
     * @param  Collection<int, CarbonInterface>  $dates
     * @param  list<array{start: CarbonInterface, end: CarbonInterface, label: string}>  $buckets
     * @return list<int>
     */
    private function countByBucket(Collection $dates, array $buckets): array
    {
        $counts = [];

        foreach ($buckets as $bucket) {
            $counts[] = $dates->filter(fn (CarbonInterface $date): bool => $date->betweenIncluded($bucket['start'], $bucket['end']))->count();
        }

        return $counts;
    }

    /**
     * Les mêmes tranches décalées dans le temps, pour comparer la période
     * précédente tranche à tranche.
     *
     * @param  list<array{start: CarbonInterface, end: CarbonInterface, label: string}>  $buckets
     * @return list<array{start: CarbonInterface, end: CarbonInterface, label: string}>
     */
    private function shift(array $buckets, int $seconds): array
    {
        return array_map(fn (array $bucket): array => [
            'start' => $bucket['start']->copy()->addSeconds($seconds),
            'end' => $bucket['end']->copy()->addSeconds($seconds),
            'label' => $bucket['label'],
        ], $buckets);
    }
}

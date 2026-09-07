<?php

declare(strict_types=1);

namespace App\Actions\Reports;

use App\Enums\Currency;
use App\Enums\InvoiceStatus;
use App\Enums\LeadSource;
use App\Enums\LeadStatus;
use App\Enums\Offer;
use App\Enums\QuoteStatus;
use App\Models\Invoice;
use App\Models\Lead;
use App\Models\Quote;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

/**
 * Chiffres clés de l'activité sur une période : leads et conversion par
 * source, délai de premier contact, devis acceptés ou refusés par formule,
 * factures émises et encaissées par mois.
 */
final class BuildReport
{
    /**
     * @return array<string, mixed>
     */
    public function handle(CarbonInterface $from, CarbonInterface $to): array
    {
        return [
            'period' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
            'leads' => $this->leads($from, $to),
            'quotes' => $this->quotes($from, $to),
            'invoices' => $this->invoices($from, $to),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function leads(CarbonInterface $from, CarbonInterface $to): array
    {
        $leads = Lead::query()->whereBetween('created_at', [$from->copy()->startOfDay(), $to->copy()->endOfDay()])->get();
        $converted = $leads->where('status', LeadStatus::Converted);

        $bySource = collect(LeadSource::cases())->map(function (LeadSource $source) use ($leads): array {
            $ofSource = $leads->where('source', $source);
            $won = $ofSource->where('status', LeadStatus::Converted)->count();

            return [
                'source' => $source->value,
                'label' => $source->label(),
                'count' => $ofSource->count(),
                'converted' => $won,
                'rate' => $this->rate($won, $ofSource->count()),
            ];
        })->filter(fn (array $row): bool => $row['count'] > 0)->values()->all();

        $contacted = $leads->filter(fn (Lead $lead): bool => $lead->last_contacted_at !== null && $lead->created_at !== null);
        $delays = $contacted->map(fn (Lead $lead): float => max(0, $lead->created_at->diffInMinutes($lead->last_contacted_at)));

        $assignees = User::query()->whereIn('id', $leads->pluck('assigned_to')->filter()->unique())->pluck('name', 'id');
        $byAssignee = $leads->groupBy(fn (Lead $lead): string => (string) ($lead->assigned_to ?? ''))
            ->map(fn (Collection $group, string $id): array => [
                'assignee' => $id === '' ? null : (int) $id,
                'label' => $id === '' ? 'Non attribué' : (string) ($assignees[(int) $id] ?? 'Membre supprimé'),
                'count' => $group->count(),
                'converted' => $group->where('status', LeadStatus::Converted)->count(),
            ])
            ->sortByDesc('count')
            ->values()
            ->all();

        return [
            'total' => $leads->count(),
            'converted' => $converted->count(),
            'daily' => $this->dailyLeads(),
            'by_offer' => [
                ...collect(Offer::cases())->map(fn (Offer $offer): array => [
                    'offer' => $offer->value,
                    'label' => $offer->label(),
                    'count' => $leads->where('offer', $offer)->count(),
                ])->all(),
                ['offer' => null, 'label' => 'Sans formule', 'count' => $leads->whereNull('offer')->count()],
            ],
            'by_assignee' => $byAssignee,
            'archived' => $leads->where('status', LeadStatus::Archived)->count(),
            'conversion_rate' => $this->rate($converted->count(), $leads->count()),
            'by_status' => collect(LeadStatus::cases())->map(fn (LeadStatus $status): array => [
                'status' => $status->value,
                'label' => $status->label(),
                'count' => $leads->where('status', $status)->count(),
            ])->all(),
            'by_source' => $bySource,
            'first_contact' => [
                'measured' => $contacted->count(),
                'average_minutes' => $delays->isEmpty() ? null : (int) round($delays->avg()),
                'within_30_rate' => $delays->isEmpty() ? null : $this->rate($delays->filter(fn (float $minutes): bool => $minutes <= 30)->count(), $delays->count()),
            ],
        ];
    }

    /**
     * Leads reçus jour par jour, mois en cours contre mois précédent (indépendant
     * de la période choisie). Les jours à venir du mois en cours valent null.
     *
     * @return array{current: string, previous: string, days: list<array{day: int, current: int|null, previous: int|null}>}
     */
    private function dailyLeads(): array
    {
        $today = today();
        $currentStart = $today->copy()->startOfMonth();
        $previousStart = $currentStart->copy()->subMonth();

        $counts = Lead::query()
            ->whereBetween('created_at', [$previousStart, $today->copy()->endOfDay()])
            ->get(['created_at'])
            ->countBy(fn (Lead $lead): string => (string) $lead->created_at?->format('Y-m-d'));

        $days = [];
        $lastDay = max($currentStart->daysInMonth, $previousStart->daysInMonth);
        for ($day = 1; $day <= $lastDay; $day++) {
            $days[] = [
                'day' => $day,
                'current' => $day > $today->day || $day > $currentStart->daysInMonth ? null : (int) ($counts[$currentStart->copy()->setDay($day)->format('Y-m-d')] ?? 0),
                'previous' => $day > $previousStart->daysInMonth ? null : (int) ($counts[$previousStart->copy()->setDay($day)->format('Y-m-d')] ?? 0),
            ];
        }

        return [
            'current' => ucfirst($currentStart->translatedFormat('F Y')),
            'previous' => ucfirst($previousStart->translatedFormat('F Y')),
            'days' => $days,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function quotes(CarbonInterface $from, CarbonInterface $to): array
    {
        $quotes = Quote::query()->whereBetween('issued_at', [$from->toDateString(), $to->toDateString()])->get();
        $decided = $quotes->filter(fn (Quote $quote): bool => in_array($quote->status, [QuoteStatus::Accepted, QuoteStatus::Invoiced, QuoteStatus::Declined], true));
        $won = $decided->filter(fn (Quote $quote): bool => $quote->status !== QuoteStatus::Declined);

        $offerOf = fn (Quote $quote): ?string => $quote->items[0]['offer'] ?? null;

        $byOffer = collect(Offer::cases())->map(function (Offer $offer) use ($quotes, $offerOf): array {
            $ofOffer = $quotes->filter(fn (Quote $quote): bool => $offerOf($quote) === $offer->value);
            $accepted = $ofOffer->filter(fn (Quote $quote): bool => in_array($quote->status, [QuoteStatus::Accepted, QuoteStatus::Invoiced], true))->count();
            $declined = $ofOffer->where('status', QuoteStatus::Declined)->count();

            return [
                'offer' => $offer->value,
                'label' => $offer->label(),
                'count' => $ofOffer->count(),
                'accepted' => $accepted,
                'declined' => $declined,
                'rate' => $this->rate($accepted, $accepted + $declined),
            ];
        })->all();

        return [
            'total' => $quotes->count(),
            'by_status' => collect(QuoteStatus::cases())->map(fn (QuoteStatus $status): array => [
                'status' => $status->value,
                'label' => $status->label(),
                'count' => $quotes->where('status', $status)->count(),
            ])->all(),
            'acceptance_rate' => $this->rate($won->count(), $decided->count()),
            'by_offer' => $byOffer,
            'accepted_amounts' => $this->sumByCurrency($won),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function invoices(CarbonInterface $from, CarbonInterface $to): array
    {
        $issued = Invoice::query()
            ->whereBetween('issued_at', [$from->toDateString(), $to->toDateString()])
            ->where('status', '!=', InvoiceStatus::Cancelled)
            ->get();
        $paid = Invoice::query()
            ->where('status', InvoiceStatus::Paid)
            ->whereBetween('paid_at', [$from->toDateString(), $to->toDateString()])
            ->get();
        $overdue = Invoice::query()->where('status', InvoiceStatus::Overdue)->get();

        $months = [];
        for ($month = $from->copy()->startOfMonth(); $month->lessThanOrEqualTo($to); $month = $month->addMonth()) {
            $key = $month->format('Y-m');
            $months[] = [
                'month' => $key,
                'label' => ucfirst($month->translatedFormat('M Y')),
                'issued' => $this->sumByCurrency($issued->filter(fn (Invoice $invoice): bool => $invoice->issued_at->format('Y-m') === $key)),
                'paid' => $this->sumByCurrency($paid->filter(fn (Invoice $invoice): bool => $invoice->paid_at?->format('Y-m') === $key)),
            ];
        }

        return [
            'count' => $issued->count(),
            'paid_count' => $paid->count(),
            'issued' => $this->sumByCurrency($issued),
            'paid' => $this->sumByCurrency($paid),
            'overdue' => ['count' => $overdue->count(), 'amounts' => $this->sumByCurrency($overdue)],
            'by_month' => $months,
        ];
    }

    /**
     * Totaux en centimes par devise, toutes les devises présentes même à zéro.
     *
     * @param  iterable<int, Invoice|Quote>  $documents
     * @return array<string, int>
     */
    private function sumByCurrency(iterable $documents): array
    {
        $amounts = collect($documents);

        return collect(Currency::cases())->mapWithKeys(fn (Currency $currency): array => [
            $currency->value => (int) $amounts->where('currency', $currency)->sum('amount_cents'),
        ])->all();
    }

    /** Pourcentage arrondi à une décimale, null sans dénominateur. */
    private function rate(int $part, int $whole): ?float
    {
        return $whole === 0 ? null : round($part * 100 / $whole, 1);
    }
}

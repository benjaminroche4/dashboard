<?php

declare(strict_types=1);

namespace App\Actions\Leads;

use App\Enums\LeadStatus;
use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;

/**
 * Déplace plusieurs leads d'un coup vers une colonne, en tête, dans l'ordre donné.
 */
final readonly class BulkUpdateLeadStatus
{
    public function __construct(private UpdateLeadStatus $updateLeadStatus) {}

    /**
     * @param  list<int>  $ids
     * @return int Nombre de leads réellement déplacés.
     */
    public function handle(array $ids, LeadStatus $status, ?User $by = null): int
    {
        return DB::transaction(function () use ($ids, $status, $by): int {
            $leads = Lead::query()->whereIn('id', $ids)->get()->sortBy(fn (Lead $lead): int => array_search($lead->id, $ids, true) ?: 0);
            $moved = 0;

            // Un seul événement temps réel pour tout le lot.
            Event::fakeFor(function () use ($leads, $status, $by, &$moved): void {
                foreach ($leads->reverse() as $lead) {
                    if ($lead->status !== $status) {
                        $moved++;
                    }

                    $this->updateLeadStatus->handle($lead, $status, 0, $by);
                }
            }, [DashboardUpdated::class]);

            if ($moved > 0) {
                event(new DashboardUpdated('leads', ['ids' => $ids], "a déplacé {$moved} lead(s) en « {$status->label()} »"));
            }

            return $moved;
        });
    }
}

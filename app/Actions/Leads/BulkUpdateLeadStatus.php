<?php

declare(strict_types=1);

namespace App\Actions\Leads;

use App\Enums\LeadLossReason;
use App\Enums\LeadStatus;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Validation\ValidationException;

/**
 * Passe plusieurs leads dans le même statut, avec le même motif de perte à
 * l'archivage. Un lead déjà dans ce statut est laissé tel quel ; un lead
 * qui ne peut pas y aller (« Converti » sans formule) est ignoré et nommé,
 * les autres passent quand même.
 */
final readonly class BulkUpdateLeadStatus
{
    public function __construct(private UpdateLeadStatus $updateLeadStatus) {}

    /**
     * @param  Collection<int, Lead>  $leads
     * @return array{moved: list<string>, skipped: list<string>}
     */
    public function handle(Collection $leads, LeadStatus $status, ?User $by = null, ?LeadLossReason $lossReason = null, ?string $lossNote = null): array
    {
        $moved = [];
        $skipped = [];

        foreach ($leads as $lead) {
            if ($lead->status === $status) {
                continue;
            }

            try {
                $this->updateLeadStatus->handle($lead, $status, null, $by, $lossReason, $lossNote);
                $moved[] = $lead->fullName();
            } catch (ValidationException) {
                $skipped[] = $lead->fullName();
            }
        }

        return ['moved' => $moved, 'skipped' => $skipped];
    }
}

<?php

declare(strict_types=1);

namespace App\Actions\Clients;

use App\Data\ClientPeopleData;
use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\User;

/**
 * Personnes d'un dossier : second locataire du foyer et second membre du
 * suivi. Sans changement, rien n'est écrit ni diffusé.
 */
final class UpdateClientPeople
{
    public function handle(Lead $lead, ClientPeopleData $data, ?User $by = null): Lead
    {
        $changes = $data->toArray();

        if ($this->unchanged($lead, $changes)) {
            return $lead;
        }

        $tenantChanged = $lead->coFullName() !== $data->coFullName()
            || $lead->co_email !== $data->coEmail
            || $lead->co_phone !== $data->coPhone;
        $incomeChanged = $lead->income_cents !== $data->incomeCents
            || $lead->co_income_cents !== $data->coIncomeCents;
        $assigneeChanged = $data->assigneeProvided && $lead->assigned_to !== $data->assignedTo;
        $followerChanged = $lead->co_assigned_to !== $data->coAssignedTo;

        $lead->fill($changes);
        $lead->save();
        $lead->load(['assignee', 'coAssignee']);

        if ($tenantChanged) {
            $name = $lead->coFullName();
            $lead->notes()->create([
                'body' => $name === null
                    ? 'Second locataire retiré du dossier.'
                    : 'Second locataire du dossier : '.$name.($lead->co_email === null ? '' : " ({$lead->co_email})").'.',
                'user_id' => $by?->id,
            ]);
        }

        if ($assigneeChanged) {
            $lead->notes()->create([
                'body' => $lead->assignee === null
                    ? 'Dossier retiré du suivi de l’équipe.'
                    : "Dossier suivi par {$lead->assignee->name}.",
                'user_id' => $by?->id,
            ]);
        }

        if ($incomeChanged) {
            $income = $lead->householdIncomeCents();
            $lead->notes()->create([
                'body' => $income === null
                    ? 'Revenus du foyer retirés du dossier.'
                    : 'Revenus du foyer : '.number_format($income / 100, 0, ',', ' ').' '.$lead->currency->value.' par mois.',
                'user_id' => $by?->id,
            ]);
        }

        if ($followerChanged) {
            $lead->notes()->create([
                'body' => $lead->coAssignee === null
                    ? 'Second membre du suivi retiré du dossier.'
                    : "Dossier suivi aussi par {$lead->coAssignee->name}.",
                'user_id' => $by?->id,
            ]);
        }

        event(new DashboardUpdated(
            'clients',
            ['id' => $lead->id, 'mentions' => array_map(fn (User $member): int => $member->id, $lead->followers())],
            "a mis à jour les personnes du dossier {$lead->fullName()}",
            $by,
        ));

        return $lead;
    }

    /**
     * @param  array<string, mixed>  $changes
     */
    private function unchanged(Lead $lead, array $changes): bool
    {
        return array_all($changes, fn ($value, $column): bool => $lead->getAttribute($column) === $value);
    }
}

<?php

declare(strict_types=1);

namespace App\Actions\Leads;

use App\Enums\EmploymentStatus;
use App\Enums\TenantSlot;
use App\Events\DashboardUpdated;
use App\Http\Requests\Leads\UpdateLeadPersonRequest;
use App\Models\Lead;
use App\Models\User;
use App\Support\PersonName;

/**
 * Une personne du lead, modifiée en place depuis la fiche : l'identité de la
 * seconde personne va dans les colonnes `co_*` (celles que le dossier client
 * lit déjà), la situation professionnelle, l'employeur et le revenu dans la
 * fiche de l'emplacement (`tenant_profiles`). La situation du lead lui-même
 * est aussi recopiée dans `leads.employment_status`, que la Converting
 * Machine et la liste lisent. Rien n'est écrit ni diffusé sans changement.
 */
final class UpdateLeadPerson
{
    /**
     * @param  array<string, mixed>  $fields
     */
    public function handle(Lead $lead, TenantSlot $slot, array $fields, ?User $by = null): Lead
    {
        $changed = [];
        $profiles = $lead->tenant_profiles ?? [];
        $profile = $profiles[$slot->value] ?? [];

        foreach ($fields as $name => $value) {
            $value = $this->clean($name, $value);

            if (in_array($name, UpdateLeadPersonRequest::IDENTITY, true)) {
                $column = "co_{$name}";

                if ($lead->getAttribute($column) !== $value) {
                    $lead->setAttribute($column, $value);
                    $changed[] = UpdateLeadPersonRequest::FIELDS[$name];
                }

                continue;
            }

            if (($profile[$name] ?? null) !== $value) {
                $profile[$name] = $value;
                $changed[] = UpdateLeadPersonRequest::FIELDS[$name];
            }

            if ($name === 'employment_status' && $slot === TenantSlot::Primary) {
                $lead->employment_status = $value === null ? null : EmploymentStatus::from($value);
            }
        }

        if ($changed === []) {
            return $lead;
        }

        $profile = array_filter($profile, fn (mixed $value): bool => $value !== null && $value !== '');

        if ($profile === []) {
            unset($profiles[$slot->value]);
        } else {
            $profiles[$slot->value] = $profile;
        }

        $lead->tenant_profiles = $profiles === [] ? null : $profiles;
        $lead->save();

        $labels = implode(', ', array_unique($changed));
        $name = $slot->name($lead);
        $subject = $slot === TenantSlot::Primary ? "du lead {$name}" : "de {$name}, seconde personne du lead {$lead->fullName()}";

        event(new DashboardUpdated('leads', ['id' => $lead->id], "a modifié {$labels} {$subject}", $by));

        return $lead;
    }

    private function clean(string $name, mixed $value): mixed
    {
        if (is_string($value)) {
            $value = trim($value);

            if ($value === '') {
                return null;
            }

            return in_array($name, ['first_name', 'last_name'], true) ? PersonName::capitalize($value) : $value;
        }

        return $value;
    }
}

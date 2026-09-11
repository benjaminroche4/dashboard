<?php

declare(strict_types=1);

namespace App\Actions\RealEstate;

use App\Data\AgentImportRowData;
use App\Enums\AgentPosition;
use App\Events\DashboardUpdated;
use App\Models\Agency;
use App\Models\Agent;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Importe des agents collés depuis un tableur. L'agence est retrouvée par son
 * nom (insensible à la casse) ou créée ; un agent dont l'e-mail ou le
 * téléphone existe déjà est ignoré.
 */
final class ImportAgents
{
    /**
     * @param  list<AgentImportRowData>  $rows
     * @return array{created: int, skipped: int, agencies_created: int, unknown_positions: list<string>}
     */
    public function handle(array $rows, ?User $by = null): array
    {
        $result = ['created' => 0, 'skipped' => 0, 'agencies_created' => 0, 'unknown_positions' => []];

        DB::transaction(function () use ($rows, $by, &$result): void {
            /** @var array<string, Agency> $agencies */
            $agencies = [];

            foreach ($rows as $row) {
                if (Agent::query()->matchingContact($row->email, $row->phone)->exists()) {
                    $result['skipped']++;

                    continue;
                }

                $agency = null;

                if ($row->agency !== null) {
                    $key = mb_strtolower($row->agency);
                    $agency = $agencies[$key] ??= Agency::query()->whereRaw('lower(name) = ?', [$key])->first()
                        ?? tap(Agency::query()->create(['name' => $row->agency, 'created_by' => $by?->id]), function () use (&$result): void {
                            $result['agencies_created']++;
                        });
                }

                $position = AgentPosition::parse($row->position);

                // Fonction non reconnue, rangée en « Autre » : à relire.
                if ($position === AgentPosition::Other && $row->position !== null
                    && mb_strtolower(trim($row->position)) !== mb_strtolower(AgentPosition::Other->label())) {
                    $result['unknown_positions'][] = trim($row->position);
                }

                Agent::query()->create([
                    'agency_id' => $agency?->id,
                    'first_name' => $row->firstName,
                    'last_name' => $row->lastName,
                    'position' => $position,
                    'email' => $row->email,
                    'phone' => $row->phone,
                    'created_by' => $by?->id,
                ]);
                $result['created']++;
            }
        });

        $result['unknown_positions'] = array_values(array_unique($result['unknown_positions']));

        if ($result['created'] > 0 || $result['agencies_created'] > 0) {
            event(new DashboardUpdated('agents', $result, "a importé {$result['created']} agent(s) immobilier(s)"));
        }

        return $result;
    }
}

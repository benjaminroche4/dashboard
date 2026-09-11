<?php

declare(strict_types=1);

namespace App\Actions\Owners;

use App\Data\OwnerImportRowData;
use App\Events\DashboardUpdated;
use App\Models\Owner;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Importe des propriétaires collés depuis un tableur : les listes arrivent en
 * feuille de calcul, pas une fiche à la fois. Un propriétaire dont l'e-mail ou
 * le téléphone est déjà connu est ignoré.
 */
final class ImportOwners
{
    /**
     * @param  list<OwnerImportRowData>  $rows
     * @return array{created: int, skipped: int}
     */
    public function handle(array $rows, ?User $by = null): array
    {
        $result = ['created' => 0, 'skipped' => 0];

        DB::transaction(function () use ($rows, $by, &$result): void {
            foreach ($rows as $row) {
                if (Owner::query()->matchingContact($row->email, $row->phone)->exists()) {
                    $result['skipped']++;

                    continue;
                }

                Owner::query()->create([
                    ...$row->toArray(),
                    'kind' => $row->kind(),
                    'created_by' => $by?->id,
                ]);
                $result['created']++;
            }
        });

        if ($result['created'] > 0) {
            event(new DashboardUpdated('owners', $result, "a importé {$result['created']} propriétaire(s)", $by));
        }

        return $result;
    }
}

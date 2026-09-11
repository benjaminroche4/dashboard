<?php

declare(strict_types=1);

namespace App\Actions\RealEstate;

use App\Data\AgencyImportRowData;
use App\Events\DashboardUpdated;
use App\Models\Agency;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Importe des agences collées depuis un tableur. Une agence déjà connue —
 * même nom (insensible à la casse), même e-mail ou même téléphone — est
 * ignorée plutôt que dupliquée.
 */
final class ImportAgencies
{
    /**
     * @param  list<AgencyImportRowData>  $rows
     * @return array{created: int, skipped: int}
     */
    public function handle(array $rows, ?User $by = null): array
    {
        $result = ['created' => 0, 'skipped' => 0];

        DB::transaction(function () use ($rows, $by, &$result): void {
            foreach ($rows as $row) {
                $known = Agency::query()
                    ->whereRaw('lower(name) = ?', [mb_strtolower($row->name)])
                    ->when(
                        $row->email !== null || $row->phone !== null,
                        fn ($query) => $query->orWhere(fn ($other) => $other->matchingContact($row->email, $row->phone)),
                    )
                    ->exists();

                if ($known) {
                    $result['skipped']++;

                    continue;
                }

                Agency::query()->create([...$row->toArray(), 'created_by' => $by?->id]);
                $result['created']++;
            }
        });

        if ($result['created'] > 0) {
            event(new DashboardUpdated('agencies', $result, "a importé {$result['created']} agence(s)", $by));
        }

        return $result;
    }
}

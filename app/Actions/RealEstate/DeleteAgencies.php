<?php

declare(strict_types=1);

namespace App\Actions\RealEstate;

use App\Models\Agency;
use Illuminate\Support\Collection;

/**
 * Supprime agences d'un coup (admins) : chacun passe par `DeleteAgency`,
 * qui diffuse son événement temps réel.
 */
final readonly class DeleteAgencies
{
    public function __construct(private DeleteAgency $delete) {}

    /**
     * @param  Collection<int, Agency>  $records
     * @return int Nombre d'enregistrements supprimés.
     */
    public function handle(Collection $records): int
    {
        $count = 0;

        foreach ($records as $record) {
            $this->delete->handle($record);
            $count++;
        }

        return $count;
    }
}

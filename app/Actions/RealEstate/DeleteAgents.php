<?php

declare(strict_types=1);

namespace App\Actions\RealEstate;

use App\Models\Agent;
use Illuminate\Support\Collection;

/**
 * Supprime agents d'un coup (admins) : chacun passe par `DeleteAgent`,
 * qui diffuse son événement temps réel.
 */
final readonly class DeleteAgents
{
    public function __construct(private DeleteAgent $delete) {}

    /**
     * @param  Collection<int, Agent>  $records
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

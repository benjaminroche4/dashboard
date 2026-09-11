<?php

declare(strict_types=1);

namespace App\Actions\Properties;

use App\Models\Property;
use Illuminate\Support\Collection;

/**
 * Supprime plusieurs biens d'un coup (admins) : chacun passe par
 * `DeleteProperty`, qui efface aussi ses photos et ses visites.
 */
final readonly class DeleteProperties
{
    public function __construct(private DeleteProperty $deleteProperty) {}

    /**
     * @param  Collection<int, Property>  $properties
     * @return int Nombre de biens supprimés.
     */
    public function handle(Collection $properties): int
    {
        $count = 0;

        foreach ($properties as $property) {
            $this->deleteProperty->handle($property);
            $count++;
        }

        return $count;
    }
}

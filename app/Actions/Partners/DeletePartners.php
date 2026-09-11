<?php

declare(strict_types=1);

namespace App\Actions\Partners;

use App\Models\Partner;
use Illuminate\Support\Collection;

/**
 * Supprime plusieurs partenaires d'un coup (admins) : chacun passe par
 * `DeletePartner`, qui diffuse son événement temps réel.
 */
final readonly class DeletePartners
{
    public function __construct(private DeletePartner $delete) {}

    /**
     * @param  Collection<int, Partner>  $partners
     * @return int Nombre de partenaires supprimés.
     */
    public function handle(Collection $partners): int
    {
        $count = 0;

        foreach ($partners as $partner) {
            $this->delete->handle($partner);
            $count++;
        }

        return $count;
    }
}

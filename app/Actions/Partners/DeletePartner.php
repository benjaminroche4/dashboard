<?php

declare(strict_types=1);

namespace App\Actions\Partners;

use App\Events\DashboardUpdated;
use App\Models\Partner;

/**
 * Supprime un partenaire.
 */
final class DeletePartner
{
    public function handle(Partner $partner): void
    {
        $id = $partner->id;
        $name = $partner->name;

        $partner->delete();

        event(new DashboardUpdated('partners', ['id' => $id, 'deleted' => true], "a supprimé le partenaire {$name}"));
    }
}

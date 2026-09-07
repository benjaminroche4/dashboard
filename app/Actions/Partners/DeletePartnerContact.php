<?php

declare(strict_types=1);

namespace App\Actions\Partners;

use App\Events\DashboardUpdated;
use App\Models\PartnerContact;

/**
 * Retire un interlocuteur d'un partenaire.
 */
final class DeletePartnerContact
{
    public function handle(PartnerContact $contact): void
    {
        $name = $contact->fullName();
        $partner = $contact->partner;

        $contact->delete();

        event(new DashboardUpdated('partners', ['id' => $partner->id], "a retiré {$name} de chez {$partner->name}"));
    }
}

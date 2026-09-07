<?php

declare(strict_types=1);

namespace App\Actions\Partners;

use App\Data\PartnerContactData;
use App\Events\DashboardUpdated;
use App\Models\Partner;
use App\Models\PartnerContact;

/**
 * Ajoute un interlocuteur à un partenaire.
 */
final class CreatePartnerContact
{
    public function handle(Partner $partner, PartnerContactData $data): PartnerContact
    {
        $contact = $partner->contacts()->create($data->toArray());

        event(new DashboardUpdated('partners', ['id' => $partner->id], "a ajouté {$contact->fullName()} chez {$partner->name}"));

        return $contact;
    }
}

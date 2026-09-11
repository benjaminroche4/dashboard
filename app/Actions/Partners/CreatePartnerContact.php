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

        if ($contact->is_primary) {
            $this->keepSinglePrimary($partner, $contact);
        }

        event(new DashboardUpdated('partners', ['id' => $partner->id], "a ajouté {$contact->fullName()} chez {$partner->name}"));

        return $contact;
    }

    /** Un seul interlocuteur principal : les autres perdent l'étiquette. */
    private function keepSinglePrimary(Partner $partner, PartnerContact $contact): void
    {
        $partner->contacts()->whereKeyNot($contact->id)->update(['is_primary' => false]);
    }
}

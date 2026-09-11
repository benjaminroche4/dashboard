<?php

declare(strict_types=1);

namespace App\Actions\Partners;

use App\Data\PartnerContactData;
use App\Events\DashboardUpdated;
use App\Models\PartnerContact;

/**
 * Modifie un interlocuteur de partenaire.
 */
final class UpdatePartnerContact
{
    public function handle(PartnerContact $contact, PartnerContactData $data): PartnerContact
    {
        $contact->fill($data->toArray())->save();

        if ($contact->is_primary) {
            // Un seul interlocuteur principal par partenaire.
            PartnerContact::query()
                ->where('partner_id', $contact->partner_id)
                ->whereKeyNot($contact->id)
                ->update(['is_primary' => false]);
        }

        event(new DashboardUpdated('partners', ['id' => $contact->partner_id], "a modifié {$contact->fullName()} chez {$contact->partner->name}"));

        return $contact;
    }
}

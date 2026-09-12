<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\Lead;
use App\Models\Partner;
use App\Models\PartnerContact;

/**
 * Préremplissage d'un devis ou d'une facture ouverte depuis une fiche : le
 * destinataire (`subject`) dit à quoi le document sera rattaché — un lead ou
 * un partenaire — et le reste remplit les champs client du formulaire.
 */
final class DocumentPrefill
{
    /**
     * @return array<string, mixed>
     */
    public static function fromLead(Lead $lead): array
    {
        return [
            'subject' => [
                'kind' => 'lead',
                'id' => $lead->id,
                'uuid' => $lead->uuid,
                'name' => $lead->fullName(),
                'url' => route('leads.show', $lead),
            ],
            // La société d'abord ; sinon le foyer (« Bruno & Charles » à deux locataires).
            'client_name' => $lead->company !== null && $lead->company !== '' ? $lead->company : $lead->householdName(),
            'client_email' => $lead->email ?? '',
            // Un lead ne porte pas d'adresse postale : elle reste à saisir.
            'client_street' => '',
            'client_postal_code' => '',
            'client_city' => '',
            'currency' => $lead->currency->value,
            'offer' => $lead->offer?->value,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function fromPartner(Partner $partner): array
    {
        // Même lecture que la fiche partenaire : l'interlocuteur principal
        // sert de repli quand le partenaire n'a pas d'adresse à lui.
        $contact = $partner->primaryContact();
        $contactEmail = $contact instanceof PartnerContact ? $contact->email : null;

        return [
            'subject' => [
                'kind' => 'partner',
                'id' => $partner->id,
                'uuid' => $partner->uuid,
                'name' => $partner->name,
                'url' => route('partners.show', $partner),
            ],
            'client_name' => $partner->name,
            'client_email' => $partner->email ?? $contactEmail ?? '',
            'client_street' => $partner->street ?? '',
            'client_postal_code' => $partner->postal_code ?? '',
            'client_city' => $partner->city ?? '',
            // Un partenaire n'a ni devise ni formule : les valeurs par défaut servent.
            'currency' => (string) config('company.default_currency'),
            'offer' => null,
        ];
    }
}

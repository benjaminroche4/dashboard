<?php

declare(strict_types=1);

namespace App\Actions\Webhooks;

use App\Actions\Leads\CreateLead;
use App\Data\LeadData;
use App\Data\WebsiteContactData;
use App\Enums\Currency;
use App\Enums\LeadSource;
use App\Models\Lead;

/**
 * Transforme une demande de contact du site en lead « À traiter ».
 *
 * Idempotent : la référence du site (CT-XXXXXX) est mémorisée dans
 * `leads.external_reference`, un renvoi du même formulaire renvoie le lead
 * existant (`wasRecentlyCreated` à false) sans en créer un second.
 */
final readonly class ImportWebsiteContact
{
    public function __construct(private CreateLead $createLead) {}

    public function handle(WebsiteContactData $contact): Lead
    {
        $existing = Lead::query()->where('external_reference', $contact->reference)->first();

        if ($existing instanceof Lead) {
            return $existing;
        }

        $data = new LeadData(
            firstName: $contact->firstName,
            lastName: $contact->lastName,
            email: $contact->email,
            phone: $contact->phone,
            company: $contact->company,
            language: $contact->language,
            offer: $contact->offer,
            source: LeadSource::Website,
            sourceNote: $this->sourceNote($contact),
            budgetCents: null,
            currency: Currency::EUR,
            arrivalAt: null,
            districts: [],
            propertyTypes: [],
            duration: null,
            guarantors: [],
            furnished: null,
            originCity: null,
            message: $contact->message,
            score: null,
            recontactChannel: null,
            recontactAt: null,
            qualificationNote: null,
            externalReference: $contact->reference,
        );

        return $this->createLead->handle($data);
    }

    private function sourceNote(WebsiteContactData $contact): string
    {
        return __('Formulaire de contact · :type · :reference', [
            'type' => $contact->helpType->label(),
            'reference' => $contact->reference,
        ]);
    }
}

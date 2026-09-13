<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\Currency;
use App\Enums\Furnished;
use App\Enums\GuarantorType;
use App\Enums\LeadDuration;
use App\Enums\LeadLanguage;
use App\Enums\Offer;
use App\Enums\PropertyType;
use App\Support\PersonName;

/**
 * Dossier client modifiable depuis sa propre page : les coordonnées du client
 * et son projet de logement. La qualification, la source et le suivi du lead
 * n'en font pas partie — le dossier se modifie sans passer par la fiche lead.
 */
final readonly class ClientDossierData
{
    /**
     * @param  list<int>  $districts
     * @param  list<PropertyType>  $propertyTypes
     * @param  list<GuarantorType>  $guarantors
     */
    public function __construct(
        public string $firstName,
        public string $lastName,
        public ?string $email,
        public ?string $phone,
        public ?string $company,
        public LeadLanguage $language,
        public ?Offer $offer,
        public ?int $budgetCents,
        public Currency $currency,
        public ?string $arrivalAt,
        public array $districts,
        public array $propertyTypes,
        public ?LeadDuration $duration,
        public array $guarantors,
        public ?Furnished $furnished,
        public ?string $originCity,
        public ?string $message,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public static function from(array $data): self
    {
        return new self(
            firstName: PersonName::capitalize((string) ($data['first_name'] ?? '')),
            lastName: PersonName::capitalize((string) ($data['last_name'] ?? '')),
            email: self::blankToNull($data['email'] ?? null),
            phone: self::blankToNull($data['phone'] ?? null),
            company: self::blankToNull($data['company'] ?? null),
            language: LeadLanguage::from(self::blankToNull($data['language'] ?? null) ?? LeadLanguage::French->value),
            offer: Offer::tryFrom(self::blankToNull($data['offer'] ?? null) ?? ''),
            budgetCents: self::amount($data['budget_cents'] ?? null),
            currency: Currency::from(self::blankToNull($data['currency'] ?? null) ?? Currency::EUR->value),
            arrivalAt: self::blankToNull($data['arrival_at'] ?? null),
            districts: array_values(array_map(intval(...), $data['districts'] ?? [])),
            propertyTypes: array_values(array_map(PropertyType::from(...), array_map(strval(...), $data['property_types'] ?? []))),
            duration: LeadDuration::tryFrom(self::blankToNull($data['duration'] ?? null) ?? ''),
            guarantors: array_values(array_map(GuarantorType::from(...), array_map(strval(...), $data['guarantors'] ?? []))),
            furnished: Furnished::tryFrom(self::blankToNull($data['furnished'] ?? null) ?? ''),
            originCity: self::blankToNull($data['origin_city'] ?? null),
            message: self::blankToNull($data['message'] ?? null),
        );
    }

    /**
     * Colonnes à écrire sur le lead. Seules celles du dossier y figurent : le
     * reste du lead (statut, score, source, suivi) n'est jamais touché.
     *
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'first_name' => $this->firstName,
            'last_name' => $this->lastName,
            'email' => $this->email,
            'phone' => $this->phone,
            'company' => $this->company,
            'language' => $this->language,
            'offer' => $this->offer,
            'budget_cents' => $this->budgetCents,
            'currency' => $this->currency,
            'arrival_at' => $this->arrivalAt,
            'districts' => $this->districts,
            'property_types' => $this->propertyTypes,
            'duration' => $this->duration,
            'guarantors' => $this->guarantors,
            'furnished' => $this->furnished,
            'origin_city' => $this->originCity,
            'message' => $this->message,
        ];
    }

    /** Nom complet du client, tel qu'il sera enregistré. */
    public function fullName(): string
    {
        return trim($this->firstName.' '.$this->lastName);
    }

    private static function amount(mixed $value): ?int
    {
        return $value === null || $value === '' ? null : (int) $value;
    }

    private static function blankToNull(mixed $value): ?string
    {
        $value = is_string($value) ? trim($value) : $value;

        return $value === null || $value === '' ? null : (string) $value;
    }
}

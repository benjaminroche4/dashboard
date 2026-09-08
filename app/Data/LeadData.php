<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\Currency;
use App\Enums\Furnished;
use App\Enums\GuarantorType;
use App\Enums\LeadDuration;
use App\Enums\LeadLanguage;
use App\Enums\LeadSegment;
use App\Enums\LeadSource;
use App\Enums\Offer;
use App\Enums\PropertyType;
use App\Enums\RecontactChannel;
use App\Support\PersonName;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\Date;

/**
 * Données validées du formulaire « Converting Machine ».
 */
final readonly class LeadData
{
    /**
     * @param  list<int>  $districts
     * @param  list<PropertyType>  $propertyTypes
     */
    public function __construct(
        public string $firstName,
        public string $lastName,
        public ?string $email,
        public ?string $phone,
        public ?string $company,
        public LeadLanguage $language,
        public ?Offer $offer,
        public LeadSource $source,
        public ?string $sourceNote,
        public ?int $budgetCents,
        public Currency $currency,
        public ?CarbonInterface $arrivalAt,
        public array $districts,
        public array $propertyTypes,
        public ?LeadDuration $duration,
        /** @var list<GuarantorType> */
        public array $guarantors,
        public ?Furnished $furnished,
        public ?string $originCity,
        public ?string $message,
        public ?int $score,
        public ?RecontactChannel $recontactChannel,
        public ?CarbonInterface $recontactAt,
        public ?string $qualificationNote,
        public ?int $assignedTo = null,
        public ?string $externalReference = null,
        /** Liste de destination à la création (« Leads locataires » ou « Leads propriétaires »), ignorée à la modification. */
        public LeadSegment $segment = LeadSegment::Tenant,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public static function from(array $data): self
    {
        return new self(
            firstName: PersonName::capitalize((string) $data['first_name']),
            lastName: PersonName::capitalize((string) $data['last_name']),
            email: self::blankToNull($data['email'] ?? null),
            phone: self::blankToNull($data['phone'] ?? null),
            company: self::blankToNull($data['company'] ?? null),
            language: LeadLanguage::from($data['language'] ?? LeadLanguage::French->value),
            offer: self::enum(Offer::class, $data['offer'] ?? null),
            source: LeadSource::from($data['source'] ?? LeadSource::Website->value),
            sourceNote: self::blankToNull($data['source_note'] ?? null),
            budgetCents: isset($data['budget_cents']) ? (int) $data['budget_cents'] : null,
            currency: Currency::from($data['currency'] ?? Currency::EUR->value),
            arrivalAt: isset($data['arrival_at']) ? Date::parse($data['arrival_at']) : null,
            districts: array_values(array_map(intval(...), $data['districts'] ?? [])),
            propertyTypes: array_values(array_map(PropertyType::from(...), $data['property_types'] ?? [])),
            duration: self::enum(LeadDuration::class, $data['duration'] ?? null),
            guarantors: array_values(array_map(GuarantorType::from(...), $data['guarantors'] ?? [])),
            furnished: self::enum(Furnished::class, $data['furnished'] ?? null),
            originCity: self::blankToNull($data['origin_city'] ?? null),
            message: self::blankToNull($data['message'] ?? null),
            score: isset($data['score']) ? (int) $data['score'] : null,
            recontactChannel: self::enum(RecontactChannel::class, $data['recontact_channel'] ?? null),
            recontactAt: isset($data['recontact_at']) ? Date::parse($data['recontact_at']) : null,
            qualificationNote: self::blankToNull($data['qualification_note'] ?? null),
            assignedTo: isset($data['assigned_to']) ? (int) $data['assigned_to'] : null,
            segment: LeadSegment::from($data['segment'] ?? LeadSegment::Tenant->value),
        );
    }

    /**
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
            'source' => $this->source,
            'source_note' => $this->sourceNote,
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
            'score' => $this->score,
            'recontact_channel' => $this->recontactChannel,
            'recontact_at' => $this->recontactAt,
            'qualification_note' => $this->qualificationNote,
            'assigned_to' => $this->assignedTo,
            'external_reference' => $this->externalReference,
        ];
    }

    /**
     * Chaîne vide ou null → null, sinon le cas de l'enum.
     *
     * @template T of \BackedEnum
     *
     * @param  class-string<T>  $class
     * @return T|null
     */
    private static function enum(string $class, mixed $value): ?\BackedEnum
    {
        return ($value === null || $value === '') ? null : $class::from($value);
    }

    private static function blankToNull(mixed $value): ?string
    {
        return is_string($value) && trim($value) !== '' ? $value : null;
    }
}

<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\LeadLanguage;
use App\Enums\Offer;
use App\Enums\WebsiteHelpType;
use App\Support\PersonName;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\Date;

/**
 * Demande de contact reçue du site Relocation In Paris (webhook signé).
 */
final readonly class WebsiteContactData
{
    public function __construct(
        public string $reference,
        public string $firstName,
        public string $lastName,
        public ?string $email,
        public ?string $phone,
        public ?string $company,
        public WebsiteHelpType $helpType,
        public ?Offer $offer,
        public ?string $message,
        public LeadLanguage $language,
        public ?CarbonInterface $createdAt,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public static function from(array $data): self
    {
        return new self(
            reference: (string) $data['reference'],
            firstName: PersonName::capitalize((string) $data['first_name']),
            lastName: PersonName::capitalize((string) $data['last_name']),
            email: self::blankToNull($data['email'] ?? null),
            phone: self::blankToNull($data['phone'] ?? null),
            company: self::blankToNull($data['company'] ?? null),
            helpType: WebsiteHelpType::from($data['help_type']),
            offer: isset($data['offer']) && $data['offer'] !== '' ? Offer::from($data['offer']) : null,
            message: self::blankToNull($data['message'] ?? null),
            language: LeadLanguage::tryFrom($data['lang'] ?? '') ?? LeadLanguage::French,
            createdAt: isset($data['created_at']) ? Date::parse($data['created_at']) : null,
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'reference' => $this->reference,
            'first_name' => $this->firstName,
            'last_name' => $this->lastName,
            'email' => $this->email,
            'phone' => $this->phone,
            'company' => $this->company,
            'help_type' => $this->helpType,
            'offer' => $this->offer,
            'message' => $this->message,
            'lang' => $this->language,
            'created_at' => $this->createdAt,
        ];
    }

    private static function blankToNull(mixed $value): ?string
    {
        return is_string($value) && trim($value) !== '' ? $value : null;
    }
}

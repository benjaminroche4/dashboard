<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\Currency;
use App\Enums\LeadSource;
use App\Enums\Offer;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\Date;

/**
 * Données validées du formulaire « Converting Machine ».
 */
final readonly class LeadData
{
    public function __construct(
        public string $firstName,
        public string $lastName,
        public ?string $email,
        public ?string $phone,
        public ?Offer $offer,
        public ?CarbonInterface $arrivalAt,
        public ?int $budgetCents,
        public Currency $currency,
        public ?string $originCity,
        public LeadSource $source,
        public ?string $message,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public static function from(array $data): self
    {
        return new self(
            firstName: $data['first_name'],
            lastName: $data['last_name'],
            email: $data['email'] ?? null,
            phone: $data['phone'] ?? null,
            offer: isset($data['offer']) ? Offer::from($data['offer']) : null,
            arrivalAt: isset($data['arrival_at']) ? Date::parse($data['arrival_at']) : null,
            budgetCents: isset($data['budget_cents']) ? (int) $data['budget_cents'] : null,
            currency: Currency::from($data['currency'] ?? Currency::EUR->value),
            originCity: $data['origin_city'] ?? null,
            source: LeadSource::from($data['source'] ?? LeadSource::Website->value),
            message: $data['message'] ?? null,
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
            'offer' => $this->offer,
            'arrival_at' => $this->arrivalAt,
            'budget_cents' => $this->budgetCents,
            'currency' => $this->currency,
            'origin_city' => $this->originCity,
            'source' => $this->source,
            'message' => $this->message,
        ];
    }
}

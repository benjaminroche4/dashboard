<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\HouseholdRole;
use App\Enums\LeadLanguage;
use App\Support\PersonName;

/**
 * Données validées d'une demande de pièces. Le client de la demande est la
 * première personne du foyer.
 */
final readonly class DocumentRequestData
{
    /**
     * @param  list<array{first_name: string, last_name: string, role: HouseholdRole, documents: list<string>}>  $persons
     */
    public function __construct(
        public ?int $leadId,
        public LeadLanguage $language,
        public ?string $message,
        public ?string $uploadUrl,
        public array $persons,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public static function from(array $data): self
    {
        /** @var list<array{first_name: string, last_name: string, role: string, documents: list<string>}> $persons */
        $persons = $data['persons'];

        return new self(
            leadId: isset($data['lead_id']) ? (int) $data['lead_id'] : null,
            language: LeadLanguage::from((string) ($data['language'] ?? 'fr')),
            message: isset($data['message']) && trim((string) $data['message']) !== '' ? trim((string) $data['message']) : null,
            uploadUrl: isset($data['upload_url']) && trim((string) $data['upload_url']) !== '' ? trim((string) $data['upload_url']) : null,
            persons: array_map(fn (array $person): array => [
                'first_name' => PersonName::capitalize($person['first_name']),
                'last_name' => PersonName::capitalize($person['last_name']),
                'role' => HouseholdRole::from($person['role']),
                'documents' => array_values(array_unique($person['documents'])),
            ], $persons),
        );
    }

    /** Prénom de la première personne, client de la demande. */
    public function firstName(): string
    {
        return $this->persons[0]['first_name'] ?? '';
    }

    /** Nom de la première personne, client de la demande. */
    public function lastName(): string
    {
        return $this->persons[0]['last_name'] ?? '';
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'lead_id' => $this->leadId,
            'first_name' => $this->firstName(),
            'last_name' => $this->lastName(),
            'language' => $this->language->value,
            'message' => $this->message,
            'upload_url' => $this->uploadUrl,
            'persons' => array_map(fn (array $person): array => [
                'first_name' => $person['first_name'],
                'last_name' => $person['last_name'],
                'role' => $person['role']->value,
                'documents' => $person['documents'],
            ], $this->persons),
        ];
    }
}

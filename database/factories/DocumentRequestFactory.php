<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\HouseholdRole;
use App\Enums\LeadLanguage;
use App\Models\DocumentRequest;
use App\Support\DocumentCatalog;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<DocumentRequest>
 */
class DocumentRequestFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $firstName = fake()->firstName();
        $lastName = fake()->lastName();

        return [
            'first_name' => $firstName,
            'last_name' => $lastName,
            'language' => LeadLanguage::French,
            'message' => fake()->boolean() ? fake()->sentence(12) : null,
            'upload_url' => 'https://drive.google.com/drive/folders/'.fake()->regexify('[A-Za-z0-9_-]{20}'),
            // La première personne est le client de la demande : mêmes nom et prénom.
            'persons' => [[
                'first_name' => $firstName,
                'last_name' => $lastName,
                'role' => HouseholdRole::Tenant->value,
                'documents' => fake()->randomElements(DocumentCatalog::keys(), 4),
            ]],
            'created_by' => null,
            'lead_id' => null,
        ];
    }

    public function english(): static
    {
        return $this->state(fn (): array => ['language' => LeadLanguage::English]);
    }

    public function withGuarantor(): static
    {
        return $this->state(fn (array $attributes): array => [
            'persons' => [
                ...$attributes['persons'],
                [
                    'first_name' => fake()->firstName(),
                    'last_name' => fake()->lastName(),
                    'role' => HouseholdRole::Guarantor->value,
                    'documents' => ['identity_document', 'payslips', 'tax_notices'],
                ],
            ],
        ]);
    }
}

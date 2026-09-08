<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\DocumentRequest;
use App\Models\DocumentUpload;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<DocumentUpload>
 */
final class DocumentUploadFactory extends Factory
{
    protected $model = DocumentUpload::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->slug(2).'.pdf';

        return [
            'document_request_id' => DocumentRequest::factory(),
            'person_index' => 0,
            'document_key' => 'tax_notices',
            'original_name' => $name,
            'path' => 'document-uploads/'.fake()->uuid().'/0/tax_notices/'.$name,
            'mime_type' => 'application/pdf',
            'size' => fake()->numberBetween(50_000, 3_000_000),
        ];
    }
}

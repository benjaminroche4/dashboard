<?php

declare(strict_types=1);

namespace App\Data;

use Illuminate\Http\UploadedFile;

/**
 * Compte rendu d'une visite : le texte et les photos prises sur place.
 * Les photos sont enregistrées par l'Action, jamais par le DTO.
 */
final readonly class VisitReportData
{
    /**
     * @param  list<UploadedFile>  $photos
     */
    public function __construct(
        public string $report,
        public array $photos = [],
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public static function from(array $data): self
    {
        return new self(
            report: trim((string) ($data['report'] ?? '')),
            photos: array_values(array_filter(
                is_array($data['photos'] ?? null) ? $data['photos'] : [],
                fn (mixed $file): bool => $file instanceof UploadedFile,
            )),
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return ['report' => $this->report];
    }
}

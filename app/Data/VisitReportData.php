<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\PropertyApplicationStatus;
use Illuminate\Http\UploadedFile;

/**
 * Compte rendu d'une visite : les impressions en texte libre, les photos
 * prises sur place, et la **prochaine étape** — ce que devient le bien pour
 * ce client, qui met à jour le suivi du dossier.
 * Les photos sont enregistrées par l'Action, jamais par le DTO.
 */
final readonly class VisitReportData
{
    /**
     * @param  list<UploadedFile>  $photos
     */
    public function __construct(
        public string $report,
        public ?PropertyApplicationStatus $nextStatus = null,
        public array $photos = [],
        public bool $notifyClient = false,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public static function from(array $data): self
    {
        return new self(
            report: trim((string) ($data['report'] ?? '')),
            nextStatus: PropertyApplicationStatus::tryFrom((string) ($data['next_status'] ?? '')),
            photos: array_values(array_filter(
                is_array($data['photos'] ?? null) ? $data['photos'] : [],
                fn (mixed $file): bool => $file instanceof UploadedFile,
            )),
            notifyClient: (bool) ($data['notify_client'] ?? false),
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return ['report' => $this->report, 'next_status' => $this->nextStatus?->value];
    }
}

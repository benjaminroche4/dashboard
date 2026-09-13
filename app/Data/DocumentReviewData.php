<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\DocumentUploadStatus;

/**
 * Décision de l'équipe sur une pièce déposée : validée ou refusée, avec un
 * motif facultatif que le client lit sur sa page de dépôt.
 */
final readonly class DocumentReviewData
{
    public function __construct(
        public DocumentUploadStatus $status,
        public ?string $note = null,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public static function from(array $data): self
    {
        $status = DocumentUploadStatus::from((string) ($data['status'] ?? DocumentUploadStatus::Pending->value));
        $note = trim((string) ($data['note'] ?? ''));

        return new self(
            status: $status,
            // Un motif n'a de sens que sur un refus : une validation repart propre.
            note: $status === DocumentUploadStatus::Refused && $note !== '' ? $note : null,
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return ['status' => $this->status->value, 'note' => $this->note];
    }
}

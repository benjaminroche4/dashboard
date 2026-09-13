<?php

declare(strict_types=1);

namespace App\Actions\Documents;

use App\Data\DocumentReviewData;
use App\Enums\DocumentUploadStatus;
use App\Events\DashboardUpdated;
use App\Models\DocumentUpload;
use App\Models\User;

/**
 * Valide ou refuse une pièce déposée par le client. Un refus peut porter un
 * motif, que le client lit sur sa page de dépôt ; revenir à « À vérifier »
 * efface la décision et son motif.
 */
final class ReviewDocumentUpload
{
    public function handle(DocumentUpload $upload, DocumentReviewData $review, User $by): DocumentUpload
    {
        $upload->loadMissing('request');
        $decided = $review->status->isDecision();

        $upload->forceFill([
            'status' => $review->status,
            'review_note' => $review->note,
            'reviewed_at' => $decided ? now() : null,
            'reviewed_by' => $decided ? $by->id : null,
        ])->save();

        event(new DashboardUpdated(
            'documents',
            ['id' => $upload->document_request_id, 'upload_id' => $upload->id],
            $this->message($upload, $review->status),
        ));

        return $upload->refresh();
    }

    private function message(DocumentUpload $upload, DocumentUploadStatus $status): string
    {
        $piece = 'la pièce « '.$upload->original_name.' » de '.$upload->request->fullName();

        return match ($status) {
            DocumentUploadStatus::Accepted => 'a validé '.$piece,
            DocumentUploadStatus::Refused => 'a refusé '.$piece,
            DocumentUploadStatus::Pending => 'a remis en vérification '.$piece,
        };
    }
}

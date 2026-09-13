<?php

declare(strict_types=1);

namespace App\Http\Controllers\Documents;

use App\Actions\Documents\DeleteDocumentUpload;
use App\Actions\Documents\ReviewDocumentUpload;
use App\Data\DocumentReviewData;
use App\Enums\DocumentUploadStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Documents\ReviewDocumentUploadRequest;
use App\Models\DocumentRequest;
use App\Models\DocumentUpload;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\StreamedResponse;

/** Pièces déposées par le client, côté équipe : téléchargement, vérification et suppression. */
class DocumentUploadController extends Controller
{
    use AuthorizesRequests;

    public function download(DocumentRequest $documentRequest, DocumentUpload $upload): StreamedResponse
    {
        $this->authorize('view', $documentRequest);

        return Storage::disk(DocumentUpload::DISK)->download($upload->path, $upload->original_name);
    }

    /** Valide ou refuse une pièce, avec un motif facultatif sur un refus. */
    public function review(ReviewDocumentUploadRequest $request, DocumentRequest $documentRequest, DocumentUpload $upload, ReviewDocumentUpload $review): RedirectResponse
    {
        $this->authorize('update', $documentRequest);

        $data = DocumentReviewData::from($request->validated());
        $review->handle($upload, $data, $request->user());

        Inertia::flash('toast', [
            'type' => $data->status === DocumentUploadStatus::Refused ? 'warning' : 'success',
            'message' => match ($data->status) {
                DocumentUploadStatus::Accepted => __('Pièce « :name » validée.', ['name' => $upload->original_name]),
                DocumentUploadStatus::Refused => __('Pièce « :name » refusée.', ['name' => $upload->original_name]),
                DocumentUploadStatus::Pending => __('Pièce « :name » remise en vérification.', ['name' => $upload->original_name]),
            },
        ]);

        return back();
    }

    public function destroy(DocumentRequest $documentRequest, DocumentUpload $upload, DeleteDocumentUpload $delete): RedirectResponse
    {
        $this->authorize('update', $documentRequest);

        $delete->handle($upload);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Pièce « :name » supprimée.', ['name' => $upload->original_name])]);

        return back();
    }
}

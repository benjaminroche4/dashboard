<?php

declare(strict_types=1);

namespace App\Http\Controllers\Documents;

use App\Actions\Documents\DeleteDocumentUpload;
use App\Http\Controllers\Controller;
use App\Models\DocumentRequest;
use App\Models\DocumentUpload;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\StreamedResponse;

/** Pièces déposées par le client, côté équipe : téléchargement et suppression. */
class DocumentUploadController extends Controller
{
    use AuthorizesRequests;

    public function download(DocumentRequest $documentRequest, DocumentUpload $upload): StreamedResponse
    {
        $this->authorize('view', $documentRequest);

        return Storage::disk(DocumentUpload::DISK)->download($upload->path, $upload->original_name);
    }

    public function destroy(DocumentRequest $documentRequest, DocumentUpload $upload, DeleteDocumentUpload $delete): RedirectResponse
    {
        $this->authorize('update', $documentRequest);

        $delete->handle($upload);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Pièce « :name » supprimée.', ['name' => $upload->original_name])]);

        return back();
    }
}

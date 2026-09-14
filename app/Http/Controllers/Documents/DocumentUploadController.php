<?php

declare(strict_types=1);

namespace App\Http\Controllers\Documents;

use App\Actions\Documents\ApplyDocumentAnalysis;
use App\Actions\Documents\DeleteDocumentUpload;
use App\Actions\Documents\ReviewDocumentUpload;
use App\Actions\Documents\StoreDocumentUploads;
use App\Data\DocumentReviewData;
use App\Enums\DocumentUploadStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Documents\ReviewDocumentUploadRequest;
use App\Http\Requests\Documents\StoreTeamDocumentUploadRequest;
use App\Jobs\AnalyzeDocumentUploadJob;
use App\Models\DocumentRequest;
use App\Models\DocumentUpload;
use App\Services\Assistant;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use RuntimeException;
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

    /**
     * La même pièce servie **dans la page** plutôt qu'en pièce jointe : on
     * relit un PDF avant de le valider, on ne le collectionne pas. `nosniff`
     * interdit au navigateur de deviner un autre type que celui annoncé.
     */
    public function preview(DocumentRequest $documentRequest, DocumentUpload $upload): StreamedResponse
    {
        $this->authorize('view', $documentRequest);

        return Storage::disk(DocumentUpload::DISK)->response($upload->path, $upload->original_name, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="'.addslashes($upload->original_name).'"',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    /**
     * Un membre verse une pièce reçue par ailleurs (e-mail, WhatsApp, en main
     * propre) : elle rejoint les fichiers de la pièce, à vérifier comme les autres.
     */
    public function store(StoreTeamDocumentUploadRequest $request, DocumentRequest $documentRequest, StoreDocumentUploads $store): RedirectResponse
    {
        /** @var list<UploadedFile> $files */
        $files = array_values($request->file('files', []));

        $uploads = $store->handle($documentRequest, (int) $request->validated('person'), (string) $request->validated('document'), $files, $request->user());
        $count = $uploads->count();

        Inertia::flash('toast', ['type' => 'success', 'message' => trans_choice('{1} :count fichier ajouté à la pièce.|[2,*] :count fichiers ajoutés à la pièce.', $count, ['count' => $count])]);

        return back();
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

    /** Demande à l'assistant de relire une pièce (en arrière-plan : la page se rafraîchit à la réponse). */
    public function analyze(DocumentRequest $documentRequest, DocumentUpload $upload, Assistant $assistant): RedirectResponse
    {
        $this->authorize('update', $documentRequest);

        if (! $assistant->isConfigured()) {
            Inertia::flash('toast', ['type' => 'warning', 'message' => __('Assistant IA non configuré (ANTHROPIC_API_KEY).')]);

            return back();
        }

        dispatch(new AnalyzeDocumentUploadJob($upload));

        Inertia::flash('toast', ['type' => 'info', 'message' => __('L’assistant relit « :name » : sa proposition s’affichera sous la pièce.', ['name' => $upload->original_name])]);

        return back();
    }

    /** Reporte sur la fiche du locataire ce que l'assistant a lu (champs vides seulement). */
    public function applyProfile(DocumentRequest $documentRequest, DocumentUpload $upload, ApplyDocumentAnalysis $apply, Request $request): RedirectResponse
    {
        $this->authorize('update', $documentRequest);

        try {
            $filled = $apply->handle($upload, $request->user());
        } catch (RuntimeException $exception) {
            Inertia::flash('toast', ['type' => 'warning', 'message' => $exception->getMessage()]);

            return back();
        }

        Inertia::flash('toast', $filled === []
            ? ['type' => 'info', 'message' => __('La fiche portait déjà tout ce que l’assistant a lu : rien à reporter.')]
            : ['type' => 'success', 'message' => __(':count champ(s) reporté(s) sur la fiche du locataire.', ['count' => count($filled)])]);

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

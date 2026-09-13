<?php

declare(strict_types=1);

namespace App\Http\Controllers\Documents;

use App\Actions\Documents\RenderDocumentRequestPdf;
use App\Actions\Documents\StoreDocumentUploads;
use App\Enums\DocumentUploadStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Documents\StoreDocumentUploadRequest;
use App\Http\Requests\Documents\VerifyDocumentAccessCodeRequest;
use App\Models\DocumentRequest;
use App\Models\DocumentUpload;
use App\Support\UploadLimits;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Page publique de dépôt des pièces (/depot/{jeton}) : seule page hors
 * connexion avec /login. La liste est retrouvée par son jeton, jamais par
 * son identifiant.
 */
class PublicDocumentUploadController extends Controller
{
    public function show(Request $request, DocumentRequest $documentRequest): Response
    {
        // Tant que le code d'appairage n'a pas été saisi dans cette session, seule la page du code s'affiche.
        if (! $this->unlocked($request, $documentRequest)) {
            return $this->inLocale($documentRequest, fn (): Response => Inertia::render('public/document-code', [
                'request' => ['name' => $documentRequest->fullName(), 'language' => $documentRequest->language->value],
                'verifyUrl' => route('documents.public.verify', ['documentRequest' => $documentRequest->public_token]),
                'company' => ['name' => config('company.name'), 'email' => config('company.email'), 'phone' => config('company.phone')],
                'labels' => [
                    'title' => __('Vos pièces justificatives'),
                    'intro' => __('Saisissez le code d’appairage à 6 chiffres qui vous a été communiqué pour ouvrir votre espace de dépôt.'),
                    'code' => __('Code d’appairage'),
                    'submit' => __('Ouvrir mon espace'),
                ],
            ]));
        }

        return $this->inLocale($documentRequest, fn (): Response => Inertia::render('public/document-upload', [
            'request' => [
                'name' => $documentRequest->fullName(),
                'language' => $documentRequest->language->value,
                'message' => $documentRequest->message,
                'persons' => $this->persons($documentRequest),
            ],
            'uploadUrl' => route('documents.public.store', ['documentRequest' => $documentRequest->public_token]),
            'company' => [
                'name' => config('company.name'),
                'email' => config('company.email'),
                'phone' => config('company.phone'),
            ],
            // Ce que le serveur accepte vraiment : la page n'annonce pas plus.
            'limits' => UploadLimits::toArray(),
            'labels' => $this->labels(),
        ]));
    }

    /** Vérifie le code d'appairage et déverrouille la page de dépôt pour cette session. */
    public function verify(VerifyDocumentAccessCodeRequest $request, DocumentRequest $documentRequest): RedirectResponse
    {
        if (! hash_equals($documentRequest->access_code, (string) $request->validated('code'))) {
            return $this->inLocale($documentRequest, fn (): RedirectResponse => back()->withErrors(['code' => __('Ce code n’est pas le bon.')]));
        }

        $request->session()->put($this->sessionKey($documentRequest), true);

        return to_route('documents.public.show', ['documentRequest' => $documentRequest->public_token]);
    }

    public function store(StoreDocumentUploadRequest $request, DocumentRequest $documentRequest, StoreDocumentUploads $store): RedirectResponse
    {
        abort_unless($this->unlocked($request, $documentRequest), 403);

        /** @var list<UploadedFile> $files */
        $files = array_values($request->file('files', []));

        $uploads = $store->handle($documentRequest, (int) $request->validated('person'), (string) $request->validated('document'), $files);

        return $this->inLocale($documentRequest, function () use ($uploads): RedirectResponse {
            $count = $uploads->count();
            Inertia::flash('toast', ['type' => 'success', 'message' => trans_choice('{1} :count fichier reçu, merci.|[2,*] :count fichiers reçus, merci.', $count, ['count' => $count])]);

            return back();
        });
    }

    /**
     * Relit une pièce déposée : le client vérifie ce qu'il a envoyé sans
     * attendre l'équipe. Même porte que le dépôt — il faut le jeton dans
     * l'URL et le code d'appairage validé dans la session —, et le fichier
     * doit appartenir à cette liste.
     */
    public function download(Request $request, DocumentRequest $documentRequest, DocumentUpload $upload): StreamedResponse
    {
        abort_unless($this->unlocked($request, $documentRequest), 403);
        abort_unless($upload->document_request_id === $documentRequest->id, 404);

        // Affiché dans l'onglet plutôt que téléchargé : on relit un PDF, on ne
        // le collectionne pas. `nosniff` interdit au navigateur de deviner un
        // autre type que celui annoncé.
        return Storage::disk(DocumentUpload::DISK)->response($upload->path, $upload->original_name, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="'.addslashes($upload->original_name).'"',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    /**
     * Personnes et pièces demandées, avec les fichiers déjà déposés pour chacune.
     *
     * @return list<array<string, mixed>>
     */
    private function persons(DocumentRequest $documentRequest): array
    {
        $documentRequest->load('uploads');

        return array_map(function (array $person, int $index) use ($documentRequest): array {
            $person['index'] = $index;
            $person['categories'] = array_map(function (array $category) use ($documentRequest, $index): array {
                $category['documents'] = array_map(function (array $document) use ($documentRequest, $index): array {
                    $document['uploads'] = $documentRequest->uploads
                        ->where('person_index', $index)
                        ->where('document_key', $document['key'])
                        ->sortBy('created_at')
                        ->values()
                        ->map(fn (DocumentUpload $upload): array => [
                            'uuid' => $upload->uuid,
                            'name' => $upload->original_name,
                            'size' => $upload->size,
                            'uploaded_at' => $upload->created_at?->toIso8601String(),
                            // Le client voit la décision de l'équipe, et le motif d'un refus.
                            'status' => $upload->status->value,
                            'status_label' => $upload->status->clientLabel(),
                            'review_note' => $upload->status === DocumentUploadStatus::Refused ? $upload->review_note : null,
                            // Le client peut rouvrir ce qu'il a déposé.
                            'url' => route('documents.public.download', [
                                'documentRequest' => $documentRequest->public_token,
                                'upload' => $upload->uuid,
                            ]),
                        ])
                        ->all();

                    return $document;
                }, $category['documents']);

                return $category;
            }, $person['categories']);

            return $person;
        }, RenderDocumentRequestPdf::persons($documentRequest), array_keys($documentRequest->persons));
    }

    /**
     * Textes de la page dans la langue du client (traductions de lang/*.json).
     *
     * @return array<string, string>
     */
    private function labels(): array
    {
        return [
            'title' => __('Vos pièces justificatives'),
            'intro' => __('Merci de réunir les pièces ci-dessous pour constituer votre dossier de location.'),
            'drop' => __('Déposez vos fichiers ici ou cliquez pour les choisir'),
            'formats' => __('PDF uniquement · :size par fichier', ['size' => StoreDocumentUploadRequest::megabytes(UploadLimits::perFile())]),
            'too_large' => __('Fichier trop lourd (:size au maximum) :', ['size' => StoreDocumentUploadRequest::megabytes(UploadLimits::perFile())]),
            'wrong_type' => __('Seul le format PDF est accepté :'),
            'too_many' => __(':count fichiers au maximum à la fois.', ['count' => UploadLimits::maxFiles()]),
            'too_heavy' => __('Envoi trop lourd (:size au maximum) : déposez vos fichiers en plusieurs fois.', ['size' => StoreDocumentUploadRequest::megabytes(UploadLimits::perRequest())]),
            'uploaded' => __('Fichiers reçus'),
            'view' => __('Ouvrir'),
            'none' => __('Aucun fichier pour le moment'),
            'sending' => __('Envoi en cours…'),
            'done' => __('Pièce reçue'),
            ...$this->trustLabels(),
            'progress' => __(':done pièce(s) reçue(s) sur :total'),
            'refused' => __('Pièce refusée, merci d’en déposer une autre.'),
        ];
    }

    /**
     * Ce qui rassure le client sur ce qu'il dépose : une page publique demande
     * des pièces d'identité et des bulletins de salaire, elle doit dire
     * clairement où ils vont. Partagé par l'écran du code et celui du dépôt.
     *
     * @return array<string, string>
     */
    private function trustLabels(): array
    {
        return [
            'privacy_title' => __('Vos documents sont entre de bonnes mains'),
            'privacy_secure' => __('Connexion chiffrée : vos fichiers voyagent protégés, et ce lien n’est accessible qu’avec votre code.'),
            'privacy_private' => __('Accès réservé : seule l’équipe :company qui suit votre dossier peut les ouvrir.', ['company' => config('company.name')]),
            'privacy_kept' => __('Jamais revendus ni transmis à un tiers : ils servent uniquement à constituer votre dossier de location.'),
        ];
    }

    private function unlocked(Request $request, DocumentRequest $documentRequest): bool
    {
        return $request->session()->get($this->sessionKey($documentRequest)) === true;
    }

    private function sessionKey(DocumentRequest $documentRequest): string
    {
        return 'document_access.'.$documentRequest->id;
    }

    /**
     * @template T
     *
     * @param  callable(): T  $callback
     * @return T
     */
    private function inLocale(DocumentRequest $documentRequest, callable $callback): mixed
    {
        $previous = App::getLocale();
        App::setLocale($documentRequest->language->value);

        try {
            return $callback();
        } finally {
            App::setLocale($previous);
        }
    }
}

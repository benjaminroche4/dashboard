<?php

declare(strict_types=1);

namespace App\Http\Controllers\Documents;

use App\Actions\Documents\RenderDocumentRequestPdf;
use App\Actions\Documents\StoreDocumentUploads;
use App\Http\Controllers\Controller;
use App\Http\Requests\Documents\StoreDocumentUploadRequest;
use App\Http\Requests\Documents\VerifyDocumentAccessCodeRequest;
use App\Models\DocumentRequest;
use App\Models\DocumentUpload;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\App;
use Inertia\Inertia;
use Inertia\Response;

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
                    'contact' => __('Une question ? Écrivez-nous :'),
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
            'formats' => __('PDF uniquement · 10 Mo par fichier'),
            'uploaded' => __('Fichiers reçus'),
            'none' => __('Aucun fichier pour le moment'),
            'sending' => __('Envoi en cours…'),
            'done' => __('Pièce reçue'),
            'contact' => __('Une question ? Écrivez-nous :'),
            'privacy' => __('Vos fichiers sont transmis de façon sécurisée et ne sont visibles que par notre équipe.'),
            'progress' => __(':done pièce(s) reçue(s) sur :total'),
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

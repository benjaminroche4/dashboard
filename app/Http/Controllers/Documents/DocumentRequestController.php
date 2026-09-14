<?php

declare(strict_types=1);

namespace App\Http\Controllers\Documents;

use App\Actions\Documents\ApplyDocumentAnalysis;
use App\Actions\Documents\BuildDossierArchive;
use App\Actions\Documents\CreateDocumentRequest;
use App\Actions\Documents\DeleteDocumentRequest;
use App\Actions\Documents\DeleteDocumentRequests;
use App\Actions\Documents\DraftPresentationLetter;
use App\Actions\Documents\LinkDocumentRequestToLead;
use App\Actions\Documents\RenderDocumentRequestPdf;
use App\Actions\Documents\RenderDossierCover;
use App\Actions\Documents\SavePresentationLetter;
use App\Actions\Documents\SendDocumentUploadLink;
use App\Actions\Documents\UpdateDocumentRequest;
use App\Data\DocumentRequestData;
use App\Enums\DocumentPreset;
use App\Enums\DocumentUploadStatus;
use App\Enums\GuarantorType;
use App\Enums\HouseholdRole;
use App\Enums\LeadLanguage;
use App\Enums\LeadStatus;
use App\Enums\TenantSlot;
use App\Http\Controllers\Controller;
use App\Http\Requests\Documents\BulkDocumentRequestsRequest;
use App\Http\Requests\Documents\LinkDocumentRequestLeadRequest;
use App\Http\Requests\Documents\SavePresentationLetterRequest;
use App\Http\Requests\Documents\SendDocumentUploadLinkRequest;
use App\Http\Requests\Documents\StoreDocumentRequestRequest;
use App\Http\Requests\Documents\UpdateDocumentRequestRequest;
use App\Jobs\AnalyzeDocumentUploadJob;
use App\Models\DocumentRequest;
use App\Models\DocumentUpload;
use App\Models\Lead;
use App\Services\Assistant;
use App\Support\DocumentCatalog;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Bus\PendingDispatch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class DocumentRequestController extends Controller
{
    use AuthorizesRequests;

    public function index(): Response
    {
        $this->authorize('viewAny', DocumentRequest::class);

        $requests = DocumentRequest::query()
            ->with(['creator', 'lead'])
            ->latest()
            ->orderByDesc('id')
            ->get()
            ->map(fn (DocumentRequest $request): array => $this->summary($request))
            ->all();

        return Inertia::render('documents/index', ['requests' => $requests]);
    }

    public function create(Request $request): Response
    {
        $this->authorize('create', DocumentRequest::class);

        // ?lead=UUID : liste créée depuis la fiche d'un lead, première personne et langue préremplies, liste rattachée.
        $lead = $request->filled('lead') ? Lead::query()->where('uuid', (string) $request->query('lead'))->first() : null;

        return Inertia::render('documents/create', [
            ...$this->formProps($lead),
            'prefill' => $lead === null ? null : [
                'lead_id' => $lead->id,
                'lead_uuid' => $lead->uuid,
                'lead_name' => $lead->fullName(),
                'first_name' => $lead->first_name,
                'last_name' => $lead->last_name,
                'language' => $lead->language->value,
            ],
        ]);
    }

    public function edit(DocumentRequest $documentRequest): Response
    {
        $this->authorize('update', $documentRequest);

        return Inertia::render('documents/create', [
            ...$this->formProps($documentRequest->lead),
            'request' => [
                'id' => $documentRequest->id,
                'uuid' => $documentRequest->uuid,
                'name' => $documentRequest->fullName(),
                'lead_id' => $documentRequest->lead_id,
                'language' => $documentRequest->language->value,
                'message' => $documentRequest->message ?? '',
                'upload_url' => $documentRequest->upload_url,
                'persons' => array_map(fn (array $person): array => [
                    'first_name' => $person['first_name'] ?? '',
                    'last_name' => $person['last_name'] ?? '',
                    'role' => $person['role'],
                    'documents' => $person['documents'],
                ], $documentRequest->persons),
            ],
        ]);
    }

    public function update(UpdateDocumentRequestRequest $request, DocumentRequest $documentRequest, UpdateDocumentRequest $update): RedirectResponse
    {
        $documentRequest = $update->handle($documentRequest, DocumentRequestData::from($request->validated()));

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Liste de pièces de :name mise à jour.', ['name' => $documentRequest->fullName()])]);

        return to_route('tools.documents.show', $documentRequest);
    }

    public function destroy(DocumentRequest $documentRequest, DeleteDocumentRequest $delete): RedirectResponse
    {
        $this->authorize('delete', $documentRequest);

        $name = $documentRequest->fullName();
        $delete->handle($documentRequest);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Liste de pièces de :name supprimée.', ['name' => $name])]);

        return to_route('tools.documents.index');
    }

    public function store(StoreDocumentRequestRequest $request, CreateDocumentRequest $create): RedirectResponse
    {
        $this->authorize('create', DocumentRequest::class);

        $documentRequest = $create->handle(DocumentRequestData::from($request->validated()), $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Liste de pièces enregistrée. Téléchargez le PDF.')]);

        return to_route('tools.documents.show', $documentRequest);
    }

    public function show(Request $request, DocumentRequest $documentRequest, RenderDocumentRequestPdf $pdf): Response
    {
        $this->authorize('view', $documentRequest);

        $documentRequest->load(['creator', 'lead', 'uploads.reviewer']);

        return Inertia::render('documents/show', [
            'request' => [
                ...$this->summary($documentRequest),
                'message' => $documentRequest->message,
                'upload_url' => $documentRequest->upload_url,
                'public_url' => $documentRequest->publicUrl(),
                'access_code' => $documentRequest->access_code,
                'presentation_letter' => $documentRequest->presentation_letter,
                'link_sent_to' => $documentRequest->link_sent_to,
                'link_sent_at' => $documentRequest->link_sent_at?->toIso8601String(),
                // Adresses connues du dossier : le client et, s'il existe, le second locataire.
                'lead_emails' => array_map(
                    fn (array $recipient): string => $recipient['email'],
                    $documentRequest->lead?->mailRecipients() ?? [],
                ),
                'uploads_count' => $documentRequest->uploads->count(),
                // Ce qui part dans le dossier fusionné et dans l'archive : une
                // pièce refusée n'est pas valide, elle en est écartée.
                'valid_uploads_count' => $documentRequest->uploads->where('status', DocumentUploadStatus::Accepted)->count(),
                // Rattacher la liste à un lead depuis sa fiche demande le droit de la modifier.
                'can_update' => $request->user()?->can('update', $documentRequest) ?? false,
                // Pièces que « Relire les pièces avec l'IA » relira : à vérifier, jamais lues, en PDF.
                'pending_ai_count' => $documentRequest->uploads->filter(fn (DocumentUpload $upload): bool => $upload->status === DocumentUploadStatus::Pending && $upload->ai_review === null && $upload->mime_type === 'application/pdf')->count(),
                'persons' => $this->personsWithUploads($documentRequest),
            ],
            'pdfAvailable' => $pdf->isConfigured(),
            // Fusion du dossier : la page de garde demande DocRaptor, les
            // pièces non (elles sont déjà des PDF).
            'coverAvailable' => $pdf->isConfigured(),
        ]);
    }

    /** Envoie au client l'e-mail avec le lien public de dépôt et le code d'appairage. */
    public function sendLink(SendDocumentUploadLinkRequest $request, DocumentRequest $documentRequest, SendDocumentUploadLink $send): RedirectResponse
    {
        $this->authorize('update', $documentRequest);

        $emails = $request->emails();
        $send->handle($documentRequest, $emails, $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Lien de dépôt envoyé à :email.', ['email' => implode(', ', $emails)])]);

        return back();
    }

    /** Rattache la liste à un lead, ou l'en détache avec `lead_id` null. */
    public function link(LinkDocumentRequestLeadRequest $request, DocumentRequest $documentRequest, LinkDocumentRequestToLead $link): RedirectResponse
    {
        $this->authorize('update', $documentRequest);

        $leadId = $request->validated('lead_id');
        $lead = is_numeric($leadId) ? Lead::query()->where('id', (int) $leadId)->firstOrFail() : null;
        $link->handle($documentRequest, $lead, $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => $lead === null
            ? __('Liste détachée du lead.')
            : __('Liste rattachée à :name.', ['name' => $lead->fullName()])]);

        return back();
    }

    /**
     * Page de garde du dossier fusionné : le navigateur la met en première
     * page, devant les pièces déposées (la fusion se fait là-bas, aucun
     * fusionneur de PDF n'étant installable sur l'hébergement).
     */
    public function cover(DocumentRequest $documentRequest, RenderDossierCover $cover): HttpResponse
    {
        $this->authorize('view', $documentRequest);

        $documentRequest->load('uploads');

        return response($cover->handle($documentRequest), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="'.RenderDossierCover::fileName($documentRequest).'"',
        ]);
    }

    /**
     * Toutes les pièces déposées dans un `.zip`, **non fusionnées** : un
     * dossier par personne, les fichiers numérotés dans l'ordre du dossier.
     */
    public function archive(DocumentRequest $documentRequest, BuildDossierArchive $archive): BinaryFileResponse|RedirectResponse
    {
        $this->authorize('view', $documentRequest);

        $documentRequest->load('uploads');

        // Rien à archiver (aucun dépôt, ou tout refusé) : le menu est déjà
        // grisé, mais une page restée ouverte ne doit pas tomber sur une 500.
        if (BuildDossierArchive::plan($documentRequest) === []) {
            Inertia::flash('toast', [
                'type' => 'warning',
                'message' => $documentRequest->uploads->isEmpty()
                    ? __('Aucune pièce déposée pour le moment.')
                    : __('Aucune pièce validée : le dossier ne part qu’avec des pièces vérifiées par l’équipe.'),
            ]);

            return back();
        }

        return response()
            ->download($archive->handle($documentRequest), BuildDossierArchive::fileName($documentRequest), [
                'Content-Type' => 'application/zip',
            ])
            ->deleteFileAfterSend();
    }

    public function pdf(DocumentRequest $documentRequest, RenderDocumentRequestPdf $pdf): HttpResponse
    {
        $this->authorize('view', $documentRequest);

        $name = RenderDocumentRequestPdf::fileName($documentRequest);

        return response($pdf->handle($documentRequest), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$name.'"',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function formProps(?Lead $attached = null): array
    {
        return [
            'catalog' => DocumentCatalog::grouped(),
            // Profils prêts à cocher (freelance, salarié, étudiant…).
            'presets' => DocumentPreset::options(),
            'roles' => HouseholdRole::options(),
            'languages' => LeadLanguage::options(),
            'leads' => $this->leadOptions($attached),
        ];
    }

    /**
     * Leads et dossiers clients proposés dans le sélecteur du formulaire, avec
     * de quoi préremplir le foyer (personne principale, garants déclarés).
     *
     * Le lead déjà rattaché est toujours proposé, même archivé.
     *
     * @return list<array<string, mixed>>
     */
    private function leadOptions(?Lead $attached = null): array
    {
        $leads = Lead::query()
            ->where(fn ($query) => $query
                ->where('status', '!=', LeadStatus::Archived)
                ->when($attached instanceof Lead, fn ($query) => $query->orWhere('id', $attached?->id)))
            ->latest('updated_at')
            ->get(['id', 'uuid', 'first_name', 'last_name', 'reference', 'company', 'language', 'status', 'guarantors'])
            ->map(fn (Lead $lead): array => [
                'id' => $lead->id,
                'uuid' => $lead->uuid,
                'name' => $lead->fullName(),
                'first_name' => $lead->first_name,
                'last_name' => $lead->last_name,
                'reference' => $lead->reference,
                'company' => $lead->company,
                'language' => $lead->language->value,
                'is_client' => $lead->status === LeadStatus::Converted,
                'guarantors' => $lead->guarantors?->map(fn (GuarantorType $guarantor): string => $guarantor->value)->values()->all() ?? [],
            ])
            ->all();

        return array_values($leads);
    }

    /** Lance la lecture IA de toutes les pièces encore sans proposition ni décision. */
    public function analyze(DocumentRequest $documentRequest, Assistant $assistant): RedirectResponse
    {
        $this->authorize('update', $documentRequest);

        if (! $assistant->isConfigured()) {
            Inertia::flash('toast', ['type' => 'warning', 'message' => __('Assistant IA non configuré (ANTHROPIC_API_KEY).')]);

            return back();
        }

        $pending = $documentRequest->uploads
            ->filter(fn (DocumentUpload $upload): bool => $upload->status === DocumentUploadStatus::Pending && $upload->ai_review === null && $upload->mime_type === 'application/pdf');

        $pending->each(fn (DocumentUpload $upload): PendingDispatch => dispatch(new AnalyzeDocumentUploadJob($upload)));

        Inertia::flash('toast', $pending->isEmpty()
            ? ['type' => 'info', 'message' => __('Toutes les pièces reçues ont déjà une proposition ou une décision.')]
            : ['type' => 'info', 'message' => __('L’assistant relit :count pièce(s) : les propositions s’afficheront au fil de l’eau.', ['count' => $pending->count()])]);

        return back();
    }

    /** Lettre de présentation proposée par l'assistant ; rien n'est enregistré avant relecture. */
    public function draftLetter(DocumentRequest $documentRequest, DraftPresentationLetter $draft): JsonResponse
    {
        $this->authorize('update', $documentRequest);

        try {
            $letter = $draft->handle($documentRequest);
        } catch (RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }

        return response()->json(['letter' => $letter]);
    }

    /** Lettre relue par l'équipe : c'est elle qui s'imprime en tête du dossier fusionné. */
    public function letter(SavePresentationLetterRequest $request, DocumentRequest $documentRequest, SavePresentationLetter $save): RedirectResponse
    {
        $this->authorize('update', $documentRequest);

        $save->handle($documentRequest, $request->validated('letter'), $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Lettre de présentation enregistrée.')]);

        return back();
    }

    public function bulkDestroy(BulkDocumentRequestsRequest $request, DeleteDocumentRequests $delete): RedirectResponse
    {
        $this->authorize('delete', DocumentRequest::class);

        $count = $delete->handle(DocumentRequest::query()->whereIn('id', $request->ids())->get());

        Inertia::flash('toast', ['type' => 'success', 'message' => __(':count liste(s) supprimée(s).', ['count' => $count])]);

        return back();
    }

    /**
     * Personnes et pièces, avec les fichiers déposés par le client sur chaque pièce.
     *
     * @return list<array<string, mixed>>
     */
    private function personsWithUploads(DocumentRequest $documentRequest): array
    {
        return array_map(function (array $person, int $index) use ($documentRequest): array {
            $person['categories'] = array_map(function (array $category) use ($documentRequest, $index): array {
                $category['documents'] = array_map(function (array $document) use ($documentRequest, $index): array {
                    $document['uploads'] = $documentRequest->uploads
                        ->where('person_index', $index)
                        ->where('document_key', $document['key'])
                        ->sortBy('created_at')
                        ->values()
                        ->map(fn (DocumentUpload $upload): array => [
                            'id' => $upload->id,
                            'uuid' => $upload->uuid,
                            'name' => $upload->original_name,
                            'size' => $upload->size,
                            'uploaded_at' => $upload->created_at?->toIso8601String(),
                            'download_url' => route('tools.documents.uploads.download', ['documentRequest' => $documentRequest, 'upload' => $upload]),
                            'status' => $upload->status->value,
                            'status_label' => $upload->status->label(),
                            'review_note' => $upload->review_note,
                            'reviewed_at' => $upload->reviewed_at?->toIso8601String(),
                            'reviewer' => $upload->reviewer?->name,
                            // Proposition de l'assistant, à relire ; report sur la fiche
                            // possible seulement pour un locataire d'un dossier client.
                            'ai_review' => $upload->ai_review,
                            'ai_reviewed_at' => $upload->ai_reviewed_at?->toIso8601String(),
                            'can_apply_profile' => $upload->ai_review !== null
                                && $documentRequest->lead?->status === LeadStatus::Converted
                                && ApplyDocumentAnalysis::tenantSlot($documentRequest, $index) instanceof TenantSlot
                                && ApplyDocumentAnalysis::analysis($upload)?->hasProfile() === true,
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
     * @return array<string, mixed>
     */
    private function summary(DocumentRequest $request): array
    {
        return [
            'id' => $request->id,
            'uuid' => $request->uuid,
            'first_name' => $request->first_name,
            'last_name' => $request->last_name,
            'name' => $request->fullName(),
            'language' => $request->language->value,
            'language_label' => $request->language->label(),
            'person_count' => count($request->persons),
            'document_count' => $request->documentCount(),
            'public_url' => $request->publicUrl(),
            'creator' => $request->creator?->name,
            'creator_avatar' => $request->creator?->avatar,
            // Un lead converti est un dossier client : nom du foyer et lien vers le dossier.
            'lead' => $request->lead === null ? null : [
                'id' => $request->lead->id,
                'uuid' => $request->lead->uuid,
                'name' => $request->lead->status === LeadStatus::Converted ? $request->lead->householdName() : $request->lead->fullName(),
                'reference' => $request->lead->reference,
                'is_client' => $request->lead->status === LeadStatus::Converted,
            ],
            'created_at' => $request->created_at?->toIso8601String(),
        ];
    }
}

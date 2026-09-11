<?php

declare(strict_types=1);

namespace App\Http\Controllers\Documents;

use App\Actions\Documents\CreateDocumentRequest;
use App\Actions\Documents\DeleteDocumentRequest;
use App\Actions\Documents\DeleteDocumentRequests;
use App\Actions\Documents\LinkDocumentRequestToLead;
use App\Actions\Documents\RenderDocumentRequestPdf;
use App\Actions\Documents\SendDocumentUploadLink;
use App\Actions\Documents\UpdateDocumentRequest;
use App\Data\DocumentRequestData;
use App\Enums\GuarantorType;
use App\Enums\HouseholdRole;
use App\Enums\LeadLanguage;
use App\Enums\LeadStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Documents\BulkDocumentRequestsRequest;
use App\Http\Requests\Documents\LinkDocumentRequestLeadRequest;
use App\Http\Requests\Documents\SendDocumentUploadLinkRequest;
use App\Http\Requests\Documents\StoreDocumentRequestRequest;
use App\Http\Requests\Documents\UpdateDocumentRequestRequest;
use App\Models\DocumentRequest;
use App\Models\DocumentUpload;
use App\Models\Lead;
use App\Support\DocumentCatalog;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Inertia\Inertia;
use Inertia\Response;

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

        $documentRequest->load(['creator', 'lead', 'uploads']);

        return Inertia::render('documents/show', [
            'request' => [
                ...$this->summary($documentRequest),
                'message' => $documentRequest->message,
                'upload_url' => $documentRequest->upload_url,
                'public_url' => $documentRequest->publicUrl(),
                'access_code' => $documentRequest->access_code,
                'link_sent_to' => $documentRequest->link_sent_to,
                'link_sent_at' => $documentRequest->link_sent_at?->toIso8601String(),
                // Adresses connues du dossier : le client et, s'il existe, le second locataire.
                'lead_emails' => array_map(
                    fn (array $recipient): string => $recipient['email'],
                    $documentRequest->lead?->mailRecipients() ?? [],
                ),
                'uploads_count' => $documentRequest->uploads->count(),
                // Rattacher la liste à un lead depuis sa fiche demande le droit de la modifier.
                'can_update' => $request->user()?->can('update', $documentRequest) ?? false,
                'persons' => $this->personsWithUploads($documentRequest),
            ],
            'pdfAvailable' => $pdf->isConfigured(),
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
            'lead' => $request->lead === null ? null : [
                'id' => $request->lead->id,
                'uuid' => $request->lead->uuid,
                'name' => $request->lead->fullName(),
                'reference' => $request->lead->reference,
            ],
            'created_at' => $request->created_at?->toIso8601String(),
        ];
    }
}

<?php

declare(strict_types=1);

use Anthropic\Messages\OutputConfig\Effort;
use App\Actions\Documents\AnalyzeDocumentUpload;
use App\Actions\Documents\ApplyDocumentAnalysis;
use App\Data\DocumentAnalysisData;
use App\Enums\DocumentUploadStatus;
use App\Enums\HouseholdRole;
use App\Enums\TenantSlot;
use App\Events\DashboardUpdated;
use App\Jobs\AnalyzeDocumentUploadJob;
use App\Models\DocumentRequest;
use App\Models\DocumentUpload;
use App\Models\Lead;
use App\Models\User;
use App\Services\Assistant;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

beforeEach(function (): void {
    Event::fake([DashboardUpdated::class]);
    Storage::fake('local');
});

/** Assistant simulé : réponse préparée, PDF et prompt mémorisés. */
function readingAssistant(array $reply, bool $configured = true): Assistant
{
    return new class($reply, $configured) extends Assistant
    {
        public string $lastPrompt = '';

        public int $pdfCount = 0;

        public function __construct(private readonly array $reply, private readonly bool $configured)
        {
            parent::__construct(key: $configured ? 'test-key' : null, model: 'claude-opus-5');
        }

        public function isConfigured(): bool
        {
            return $this->configured;
        }

        public function extractFromPdf(string $system, string $prompt, array $schema, array $pdfs, int $maxTokens = 8000, Effort $effort = Effort::LOW): array
        {
            $this->lastPrompt = $prompt;
            $this->pdfCount = count($pdfs);

            return $this->reply;
        }
    };
}

/** Une liste rattachée à un dossier client, avec une pièce PDF sur le disque. */
function pdfUpload(array $persons = [], int $personIndex = 0, string $key = 'identity_document'): DocumentUpload
{
    $lead = Lead::factory()->converted()->create(['first_name' => 'Léa', 'last_name' => 'Durand']);
    $request = DocumentRequest::factory()->for($lead)->create([
        'persons' => $persons ?: [[
            'first_name' => 'Léa',
            'last_name' => 'Durand',
            'role' => HouseholdRole::Tenant->value,
            'documents' => [$key],
        ]],
    ]);
    // Un vrai contenu sur le disque : c'est lui que l'assistant reçoit.
    $path = "document-uploads/{$request->uuid}/{$personIndex}/{$key}/cni.pdf";
    Storage::disk('local')->put($path, '%PDF-1.4 test');

    return DocumentUpload::factory()->for($request, 'request')->create([
        'person_index' => $personIndex,
        'document_key' => $key,
        'original_name' => 'cni-lea.pdf',
        'path' => $path,
        'mime_type' => 'application/pdf',
    ]);
}

$reply = [
    'document_type' => 'Titre de séjour',
    'matches_request' => true,
    'verdict' => 'refused',
    'reason' => 'Le titre a expiré le 12/03/2026 : déposez le récépissé de renouvellement.',
    'holder_name' => 'Léa DURAND',
    'document_date' => null,
    'expires_at' => '2026-03-12',
    'profile' => [
        'birth_date' => '1994-05-21',
        'nationality' => 'italienne',
        'birth_place' => 'Milan',
        'residency_status' => 'titre_sejour',
        'residency_number' => 'FR123',
        'residency_expires_at' => '2026-03-12',
        'employment_status' => null,
        'employer' => null,
        'monthly_net_income' => null,
    ],
];

it('reads the document, keeps the proposal on the upload and tells the follow-up', function () use ($reply): void {
    $upload = pdfUpload();
    $assistant = readingAssistant($reply);
    app()->instance(Assistant::class, $assistant);

    $analysis = resolve(AnalyzeDocumentUpload::class)->handle($upload);

    expect($assistant->pdfCount)->toBe(1)
        ->and($assistant->lastPrompt)->toContain('Pièce demandée')->toContain('Léa Durand (Locataire)')
        ->and($analysis->verdict)->toBe(DocumentUploadStatus::Refused)
        ->and($analysis->profile['nationality'])->toBe('italienne')
        // La décision reste à l'équipe : le statut n'a pas bougé.
        ->and($upload->refresh()->status)->toBe(DocumentUploadStatus::Pending)
        ->and($upload->ai_review['verdict'])->toBe('refused')
        ->and($upload->ai_reviewed_at)->not->toBeNull();

    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => str_starts_with((string) $event->message, 'L’assistant a lu la pièce « cni-lea.pdf »'));
});

it('never accepts a document that is not the requested piece', function (): void {
    $analysis = DocumentAnalysisData::from([
        'document_type' => 'Facture EDF',
        'matches_request' => false,
        'verdict' => 'accepted',
        'reason' => 'Lisible.',
        'profile' => ['birth_date' => '31/12/1990', 'monthly_net_income' => '3200'],
    ]);

    expect($analysis->verdict)->toBe(DocumentUploadStatus::Refused)
        // Une date mal formée est écartée, un revenu est gardé en euros.
        ->and($analysis->profile)->toBe(['income' => 3200.0]);
});

it('queues a reading for every PDF the client deposits', function (): void {
    Queue::fake();
    app()->instance(Assistant::class, readingAssistant([]));
    $request = DocumentRequest::factory()->create([
        'persons' => [['first_name' => 'Léa', 'last_name' => 'Durand', 'role' => HouseholdRole::Tenant->value, 'documents' => ['identity_document']]],
    ]);

    $this->withSession(["document_access.{$request->id}" => true])
        ->post(route('documents.public.store', $request->public_token), [
            'person' => 0,
            'document' => 'identity_document',
            'files' => [UploadedFile::fake()->create('cni.pdf', 20, 'application/pdf')],
        ])
        ->assertRedirect();

    Queue::assertPushed(AnalyzeDocumentUploadJob::class, 1);
});

it('lets a member ask for a reading, one piece or the whole list', function (): void {
    Queue::fake();
    app()->instance(Assistant::class, readingAssistant([]));
    $upload = pdfUpload();
    $member = User::factory()->staff()->create();

    $this->actingAs($member)
        ->post(route('tools.documents.uploads.analyze', ['documentRequest' => $upload->request, 'upload' => $upload]))
        ->assertRedirect();
    $this->actingAs($member)
        ->post(route('tools.documents.analyze', $upload->request))
        ->assertRedirect();

    Queue::assertPushed(AnalyzeDocumentUploadJob::class, 2);
});

it('fills only the empty fields of the tenant profile', function () use ($reply): void {
    $upload = pdfUpload();
    $lead = $upload->request->lead;
    // La nationalité a déjà été saisie à la main : elle ne bouge pas.
    $lead->forceFill(['tenant_profiles' => ['primary' => ['nationality' => 'Française']]])->save();
    $upload->forceFill(['ai_review' => DocumentAnalysisData::from($reply)->toArray()])->save();

    $filled = resolve(ApplyDocumentAnalysis::class)->handle($upload, User::factory()->staff()->create());
    $profile = $lead->refresh()->tenant_profiles['primary'];

    expect($filled)->toContain('birth_date')->not->toContain('nationality')
        ->and($profile['nationality'])->toBe('Française')
        ->and($profile['birth_date'])->toBe('1994-05-21')
        ->and($profile['residency_status'])->toBe('titre_sejour')
        ->and($profile['residency_expires_at'])->toBe('2026-03-12');
});

it('maps the persons of a list to the tenant slots of the dossier', function (): void {
    $request = DocumentRequest::factory()->make(['persons' => [
        ['first_name' => 'Léa', 'last_name' => 'Durand', 'role' => HouseholdRole::Tenant->value, 'documents' => []],
        ['first_name' => 'Marc', 'last_name' => 'Durand', 'role' => HouseholdRole::Guarantor->value, 'documents' => []],
        ['first_name' => 'Bruno', 'last_name' => 'Mata', 'role' => HouseholdRole::Tenant->value, 'documents' => []],
    ]]);

    expect(ApplyDocumentAnalysis::tenantSlot($request, 0))->toBe(TenantSlot::Primary)
        ->and(ApplyDocumentAnalysis::tenantSlot($request, 1))->toBeNull()
        ->and(ApplyDocumentAnalysis::tenantSlot($request, 2))->toBe(TenantSlot::Co);
});

it('refuses to apply a guarantor piece to a tenant profile', function () use ($reply): void {
    $upload = pdfUpload(persons: [
        ['first_name' => 'Léa', 'last_name' => 'Durand', 'role' => HouseholdRole::Tenant->value, 'documents' => []],
        ['first_name' => 'Marc', 'last_name' => 'Durand', 'role' => HouseholdRole::Guarantor->value, 'documents' => ['identity_document']],
    ], personIndex: 1);
    $upload->forceFill(['ai_review' => DocumentAnalysisData::from($reply)->toArray()])->save();

    $this->actingAs(User::factory()->staff()->create())
        ->post(route('tools.documents.uploads.profile', ['documentRequest' => $upload->request, 'upload' => $upload]))
        ->assertRedirect();

    // Rien n'a été écrit sur la fiche : un garant n'en a pas.
    expect($upload->request->lead?->refresh()->tenant_profiles)->toBeNull();
});

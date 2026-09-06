<?php

declare(strict_types=1);

use App\Actions\Documents\CreateDocumentRequest;
use App\Actions\Documents\DeleteDocumentRequest;
use App\Actions\Documents\RenderDocumentRequestPdf;
use App\Actions\Documents\UpdateDocumentRequest;
use App\Data\DocumentRequestData;
use App\Enums\HouseholdRole;
use App\Enums\LeadLanguage;
use App\Events\DashboardUpdated;
use App\Models\DocumentRequest;
use App\Models\User;
use App\Services\DocRaptor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

function documentRequestPayload(array $overrides = []): array
{
    return [
        'language' => 'fr',
        'message' => '  Merci de tout déposer avant le 15.  ',
        'upload_url' => 'https://drive.google.com/drive/folders/abc',
        'persons' => [
            ['first_name' => ' léa ', 'last_name' => 'MARTIN', 'role' => 'tenant', 'documents' => ['identity_document', 'payslips', 'payslips']],
            ['first_name' => 'Paul', 'last_name' => 'Martin', 'role' => 'guarantor', 'documents' => ['tax_notices']],
        ],
        ...$overrides,
    ];
}

test('the DTO takes the client from the first person and normalises names, empty fields, roles and duplicate documents', function (): void {
    $data = DocumentRequestData::from(documentRequestPayload(['message' => '   ']));

    expect($data->firstName())->toBe('Léa')
        ->and($data->lastName())->toBe('Martin')
        ->and($data->message)->toBeNull()
        ->and($data->language)->toBe(LeadLanguage::French)
        ->and($data->persons[0]['role'])->toBe(HouseholdRole::Tenant)
        ->and($data->persons[0]['documents'])->toBe(['identity_document', 'payslips'])
        ->and($data->toArray()['first_name'])->toBe('Léa')
        ->and($data->toArray())->not->toHaveKey('email')
        ->and($data->toArray()['persons'][1])->toBe(['first_name' => 'Paul', 'last_name' => 'Martin', 'role' => 'guarantor', 'documents' => ['tax_notices']]);
});

test('it stores the request with its creator and broadcasts to the staff', function (): void {
    Event::fake([DashboardUpdated::class]);
    $creator = User::factory()->create();

    $request = (new CreateDocumentRequest)->handle(DocumentRequestData::from(documentRequestPayload()), $creator);

    expect($request->fullName())->toBe('Léa Martin')
        ->and($request->created_by)->toBe($creator->id)
        ->and($request->message)->toBe('Merci de tout déposer avant le 15.')
        ->and($request->documentCount())->toBe(3)
        ->and($request->persons)->toHaveCount(2);

    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->resource === 'documents'
        && $event->message === 'a préparé une demande de pièces pour Léa Martin');
});

test('it updates the request from new data and broadcasts to the staff', function (): void {
    Event::fake([DashboardUpdated::class]);
    $request = DocumentRequest::factory()->create();

    $updated = (new UpdateDocumentRequest)->handle($request, DocumentRequestData::from(documentRequestPayload(['language' => 'en'])));

    expect($updated->fullName())->toBe('Léa Martin')
        ->and($updated->language)->toBe(LeadLanguage::English)
        ->and($updated->persons)->toHaveCount(2)
        ->and($updated->persons[1]['first_name'])->toBe('Paul');

    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->message === 'a modifié la liste de pièces de Léa Martin');
});

test('it deletes the request and broadcasts the deletion', function (): void {
    Event::fake([DashboardUpdated::class]);
    $request = DocumentRequest::factory()->create(['first_name' => 'Léa', 'last_name' => 'Martin']);

    (new DeleteDocumentRequest)->handle($request);

    expect(DocumentRequest::query()->count())->toBe(0);
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->payload['deleted'] === true
        && $event->message === 'a supprimé la liste de pièces de Léa Martin');
});

test('the PDF HTML is rendered in the client language with labelled documents and the upload link', function (): void {
    $request = DocumentRequest::factory()->english()->create([
        'first_name' => 'John',
        'last_name' => 'Doe',
        'message' => null,
        'upload_url' => 'https://drive.google.com/x',
        'persons' => [['first_name' => 'Jane', 'last_name' => 'Doe', 'role' => 'guarantor', 'documents' => ['payslips', 'identity_document']]],
    ]);

    $html = (new RenderDocumentRequestPdf(new DocRaptor(null, true, 'https://api.docraptor.com/docs')))->html($request);

    expect($html)->toContain('Documents to provide')
        ->toContain('Jane Doe')
        ->toContain('Guarantor')
        ->toContain('Work')
        ->toContain('Identity')
        ->toContain('Last 3 payslips')
        ->toContain('Front and back')
        ->toContain('https://drive.google.com/x')
        ->not->toContain('Pièces à fournir')
        ->and(app()->getLocale())->toBe('fr')
        ->and(RenderDocumentRequestPdf::fileName($request))->toBe('documents-john-doe.pdf');
});

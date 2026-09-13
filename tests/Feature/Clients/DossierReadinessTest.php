<?php

declare(strict_types=1);

use App\Actions\Clients\SummarizeDossierReadiness;
use App\Enums\DocumentUploadStatus;
use App\Enums\DossierStatus;
use App\Enums\HouseholdRole;
use App\Models\DocumentRequest;
use App\Models\DocumentUpload;
use App\Models\Lead;
use App\Models\User;
use Inertia\Testing\AssertableInertia;

/** Dossier client avec une liste demandant trois pièces au locataire. */
function clientAskingThree(): Lead
{
    $client = Lead::factory()->converted()->create();

    DocumentRequest::factory()->create([
        'lead_id' => $client->id,
        'persons' => [[
            'first_name' => 'Léa',
            'last_name' => 'Durand',
            'role' => HouseholdRole::Tenant->value,
            'documents' => ['identity_document', 'rib', 'payslips'],
        ]],
    ]);

    return $client->refresh();
}

/** Dépose un fichier sur une pièce, avec l'état voulu. */
function deposit(Lead $client, string $key, DocumentUploadStatus $status = DocumentUploadStatus::Pending): DocumentUpload
{
    return DocumentUpload::factory()
        ->for($client->documentRequests()->first(), 'request')
        ->create(['person_index' => 0, 'document_key' => $key, 'status' => $status]);
}

test('a client without any list has a dossier that has not started', function (): void {
    $readiness = resolve(SummarizeDossierReadiness::class)->handle(Lead::factory()->converted()->create());

    expect($readiness->status)->toBe(DossierStatus::NotStarted)
        ->and($readiness->total)->toBe(0)
        ->and($readiness->percent())->toBe(0);
});

test('pieces are counted, not files: everything missing at first', function (): void {
    $readiness = resolve(SummarizeDossierReadiness::class)->handle(clientAskingThree());

    expect($readiness->status)->toBe(DossierStatus::Incomplete)
        ->and($readiness->total)->toBe(3)
        ->and($readiness->missing)->toBe(3)
        ->and($readiness->accepted)->toBe(0);
});

test('a received piece waits for the team, and a full list becomes « à vérifier »', function (): void {
    $client = clientAskingThree();

    foreach (['identity_document', 'rib', 'payslips'] as $key) {
        deposit($client, $key);
    }

    $readiness = resolve(SummarizeDossierReadiness::class)->handle($client->refresh());

    expect($readiness->status)->toBe(DossierStatus::ToCheck)
        ->and($readiness->toCheck)->toBe(3)
        ->and($readiness->missing)->toBe(0);
});

test('the dossier is ready only once every piece is approved', function (): void {
    $client = clientAskingThree();

    foreach (['identity_document', 'rib', 'payslips'] as $key) {
        deposit($client, $key, DocumentUploadStatus::Accepted);
    }

    $readiness = resolve(SummarizeDossierReadiness::class)->handle($client->refresh());

    expect($readiness->status)->toBe(DossierStatus::Ready)
        ->and($readiness->accepted)->toBe(3)
        ->and($readiness->percent())->toBe(100);
});

test('a refused piece is to be deposited again, and keeps the dossier incomplete', function (): void {
    $client = clientAskingThree();

    deposit($client, 'identity_document', DocumentUploadStatus::Accepted);
    deposit($client, 'rib', DocumentUploadStatus::Accepted);
    deposit($client, 'payslips', DocumentUploadStatus::Refused);

    $readiness = resolve(SummarizeDossierReadiness::class)->handle($client->refresh());

    expect($readiness->status)->toBe(DossierStatus::Incomplete)
        ->and($readiness->refused)->toBe(1)
        ->and($readiness->accepted)->toBe(2)
        ->and($readiness->percent())->toBe(67);
});

test('the best file of a piece wins: a refusal followed by a new file no longer blocks', function (): void {
    $client = clientAskingThree();

    deposit($client, 'identity_document', DocumentUploadStatus::Refused);
    // Le client en redépose un : la pièce attend de nouveau l'équipe.
    deposit($client, 'identity_document');

    $readiness = resolve(SummarizeDossierReadiness::class)->handle($client->refresh());

    expect($readiness->refused)->toBe(0)
        ->and($readiness->toCheck)->toBe(1);
});

test('the dossier page carries the readiness', function (): void {
    $client = clientAskingThree();
    deposit($client, 'rib', DocumentUploadStatus::Accepted);

    $this->actingAs(User::factory()->create())
        ->get(route('clients.show', $client))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('clients/show')
            ->where('readiness.status', 'incomplete')
            ->where('readiness.status_label', 'Incomplet')
            ->where('readiness.total', 3)
            ->where('readiness.accepted', 1)
            ->where('readiness.missing', 2)
            ->where('readiness.percent', 33)
            ->etc());
});

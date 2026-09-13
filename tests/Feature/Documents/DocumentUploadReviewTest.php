<?php

declare(strict_types=1);

use App\Enums\DocumentUploadStatus;
use App\Enums\HouseholdRole;
use App\Events\DashboardUpdated;
use App\Models\DocumentRequest;
use App\Models\DocumentUpload;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Inertia\Testing\AssertableInertia;

beforeEach(function (): void {
    Event::fake([DashboardUpdated::class]);
});

/** Liste demandant une seule pièce d'identité à un locataire. */
function listAskingIdentity(): DocumentRequest
{
    return DocumentRequest::factory()->create([
        'persons' => [[
            'first_name' => 'Léa',
            'last_name' => 'Durand',
            'role' => HouseholdRole::Tenant->value,
            'documents' => ['identity_document'],
        ]],
    ]);
}

/** Une pièce déposée sur une liste, prête à être vérifiée. */
function uploadToReview(): DocumentUpload
{
    return DocumentUpload::factory()->for(listAskingIdentity(), 'request')->create([
        'document_key' => 'identity_document',
        'original_name' => 'cni-lea.pdf',
    ]);
}

test('a member approves a document', function (): void {
    $upload = uploadToReview();
    $member = User::factory()->staff()->create();

    $this->actingAs($member)
        ->patch(route('tools.documents.uploads.review', ['documentRequest' => $upload->request, 'upload' => $upload]), [
            'status' => DocumentUploadStatus::Accepted->value,
        ])
        ->assertRedirect();

    $upload->refresh();

    expect($upload->status)->toBe(DocumentUploadStatus::Accepted)
        ->and($upload->review_note)->toBeNull()
        ->and($upload->reviewed_by)->toBe($member->id)
        ->and($upload->reviewed_at)->not->toBeNull();

    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => str_contains($event->message ?? '', 'a validé la pièce « cni-lea.pdf »'));
});

test('a refusal carries an optional reason, kept for the client', function (): void {
    $upload = uploadToReview();

    $this->actingAs(User::factory()->staff()->create())
        ->patch(route('tools.documents.uploads.review', ['documentRequest' => $upload->request, 'upload' => $upload]), [
            'status' => DocumentUploadStatus::Refused->value,
            'note' => 'Document illisible, merci de renvoyer un scan complet.',
        ])
        ->assertRedirect();

    expect($upload->refresh()->status)->toBe(DocumentUploadStatus::Refused)
        ->and($upload->review_note)->toBe('Document illisible, merci de renvoyer un scan complet.');
});

test('a refusal without a reason is accepted, and approving clears a previous reason', function (): void {
    $upload = uploadToReview();
    $member = User::factory()->staff()->create();
    $url = route('tools.documents.uploads.review', ['documentRequest' => $upload->request, 'upload' => $upload]);

    $this->actingAs($member)->patch($url, ['status' => DocumentUploadStatus::Refused->value])->assertRedirect();
    expect($upload->refresh()->review_note)->toBeNull();

    $this->actingAs($member)->patch($url, ['status' => DocumentUploadStatus::Refused->value, 'note' => 'Page manquante.'])->assertRedirect();
    expect($upload->refresh()->review_note)->toBe('Page manquante.');

    // Une validation repart propre : le motif du refus précédent disparaît.
    $this->actingAs($member)->patch($url, ['status' => DocumentUploadStatus::Accepted->value, 'note' => 'Page manquante.'])->assertRedirect();
    expect($upload->refresh()->review_note)->toBeNull();
});

test('going back to « à vérifier » forgets the decision and its author', function (): void {
    $upload = uploadToReview();
    $member = User::factory()->staff()->create();
    $url = route('tools.documents.uploads.review', ['documentRequest' => $upload->request, 'upload' => $upload]);

    $this->actingAs($member)->patch($url, ['status' => DocumentUploadStatus::Refused->value, 'note' => 'Illisible.'])->assertRedirect();
    $this->actingAs($member)->patch($url, ['status' => DocumentUploadStatus::Pending->value])->assertRedirect();

    $upload->refresh();

    expect($upload->status)->toBe(DocumentUploadStatus::Pending)
        ->and($upload->review_note)->toBeNull()
        ->and($upload->reviewed_at)->toBeNull()
        ->and($upload->reviewed_by)->toBeNull();
});

test('an unknown decision and an overlong reason are refused', function (): void {
    $upload = uploadToReview();
    $member = User::factory()->staff()->create();
    $url = route('tools.documents.uploads.review', ['documentRequest' => $upload->request, 'upload' => $upload]);

    $this->actingAs($member)->patch($url, ['status' => 'maybe'])->assertSessionHasErrors('status');
    $this->actingAs($member)->patch($url, ['status' => DocumentUploadStatus::Refused->value, 'note' => str_repeat('a', 501)])->assertSessionHasErrors('note');
});

test('an upload of another list is not reachable', function (): void {
    $upload = uploadToReview();
    $other = DocumentRequest::factory()->create();

    $this->actingAs(User::factory()->staff()->create())
        ->patch(route('tools.documents.uploads.review', ['documentRequest' => $other, 'upload' => $upload]), [
            'status' => DocumentUploadStatus::Accepted->value,
        ])
        ->assertNotFound();
});

test('the list page carries each decision, its reason and its author', function (): void {
    $upload = uploadToReview();
    $member = User::factory()->staff()->create(['name' => 'Charles Martin']);
    $upload->forceFill([
        'status' => DocumentUploadStatus::Refused,
        'review_note' => 'Illisible.',
        'reviewed_at' => now(),
        'reviewed_by' => $member->id,
    ])->save();

    $this->actingAs($member)
        ->get(route('tools.documents.show', $upload->request))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('documents/show')
            ->where('request.persons.0.categories.0.documents.0.uploads.0.status', 'refused')
            ->where('request.persons.0.categories.0.documents.0.uploads.0.status_label', 'Refusée')
            ->where('request.persons.0.categories.0.documents.0.uploads.0.review_note', 'Illisible.')
            ->where('request.persons.0.categories.0.documents.0.uploads.0.reviewer', 'Charles Martin')
            ->etc());
});

test('the client sees the decision and the reason on the public page, and a refused document is still missing', function (): void {
    $request = listAskingIdentity();
    $upload = DocumentUpload::factory()->for($request, 'request')->create(['document_key' => 'identity_document']);
    $upload->forceFill(['status' => DocumentUploadStatus::Refused, 'review_note' => 'Illisible.', 'reviewed_at' => now()])->save();

    $this->withSession(['document_access.'.$request->id => true])
        ->get($request->publicUrl())
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('public/document-upload')
            ->where('request.persons.0.categories.0.documents.0.uploads.0.status', 'refused')
            ->where('request.persons.0.categories.0.documents.0.uploads.0.review_note', 'Illisible.')
            ->etc());
});

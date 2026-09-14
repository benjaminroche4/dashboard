<?php

declare(strict_types=1);

use App\Enums\DocumentUploadStatus;
use App\Enums\HouseholdRole;
use App\Enums\SiteSection;
use App\Events\DashboardUpdated;
use App\Models\DocumentRequest;
use App\Models\DocumentUpload;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;

beforeEach(function (): void {
    Event::fake([DashboardUpdated::class]);
    Storage::fake(DocumentUpload::DISK);
});

function listAskingPayslips(): DocumentRequest
{
    return DocumentRequest::factory()->create([
        'persons' => [[
            'first_name' => 'Léa',
            'last_name' => 'Durand',
            'role' => HouseholdRole::Tenant->value,
            'documents' => ['identity_document', 'payslips'],
        ]],
    ]);
}

test('a member adds a document received elsewhere to a piece, as a file to verify', function (): void {
    $list = listAskingPayslips();
    $member = User::factory()->create();

    $this->actingAs($member)
        ->post(route('tools.documents.uploads.store', $list), [
            'person' => 0,
            'document' => 'payslips',
            'files' => [UploadedFile::fake()->create('fiche-paie-juillet.pdf', 120, 'application/pdf')],
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $upload = DocumentUpload::query()->sole();

    expect($upload->document_key)->toBe('payslips')
        ->and($upload->person_index)->toBe(0)
        ->and($upload->original_name)->toBe('fiche-paie-juillet.pdf')
        // Versée par l'équipe, la pièce se vérifie comme les autres.
        ->and($upload->status)->toBe(DocumentUploadStatus::Pending);
    Storage::disk(DocumentUpload::DISK)->assertExists($upload->path);

    // Le toast nomme le membre, pas le client : c'est lui qui a versé la pièce.
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => str_contains($event->message, 'a versé 1 fichier pour « 3 derniers bulletins de salaire » (Léa Durand)')
        && ($event->actor['id'] ?? null) === $member->id);
});

test('the piece must be requested for that person, and only PDF files are accepted', function (): void {
    $list = listAskingPayslips();
    $member = User::factory()->create();

    $this->actingAs($member)
        ->post(route('tools.documents.uploads.store', $list), [
            'person' => 0,
            'document' => 'tax_notice',
            'files' => [UploadedFile::fake()->create('avis.pdf', 10, 'application/pdf')],
        ])
        ->assertSessionHasErrors(['document']);

    $this->actingAs($member)
        ->post(route('tools.documents.uploads.store', $list), [
            'person' => 0,
            'document' => 'payslips',
            'files' => [UploadedFile::fake()->image('photo.jpg')],
        ])
        ->assertSessionHasErrors(['files.0']);

    expect(DocumentUpload::query()->count())->toBe(0);
});

test('a member who may only read the lists cannot add a document', function (): void {
    $list = listAskingPayslips();
    $reader = User::factory()->create(['permissions' => [SiteSection::Documents->value => 'read']]);

    $this->actingAs($reader)
        ->post(route('tools.documents.uploads.store', $list), [
            'person' => 0,
            'document' => 'payslips',
            'files' => [UploadedFile::fake()->create('fiche.pdf', 10, 'application/pdf')],
        ])
        ->assertForbidden();
});

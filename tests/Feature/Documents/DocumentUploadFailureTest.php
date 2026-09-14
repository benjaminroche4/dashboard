<?php

declare(strict_types=1);

use App\Actions\Storage\CheckStorageSetup;
use App\Enums\HouseholdRole;
use App\Events\DashboardUpdated;
use App\Models\DocumentRequest;
use App\Models\DocumentUpload;
use App\Models\User;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use League\Flysystem\UnableToWriteFile;

beforeEach(fn () => Event::fake([DashboardUpdated::class]));

function listForFailure(): DocumentRequest
{
    return DocumentRequest::factory()->create([
        'persons' => [[
            'first_name' => 'Léa',
            'last_name' => 'Durand',
            'role' => HouseholdRole::Tenant->value,
            'documents' => ['payslips'],
        ]],
    ]);
}

/** Un disque qui refuse d'écrire, comme un bucket mal configuré. */
function brokenDisk(): void
{
    $disk = Mockery::mock(Filesystem::class);
    $disk->shouldReceive('putFile')->andThrow(UnableToWriteFile::atLocation('document-uploads/x', 'Access Denied'));
    $disk->shouldReceive('putFileAs')->andThrow(UnableToWriteFile::atLocation('document-uploads/x', 'Access Denied'));
    $disk->shouldReceive('put')->andThrow(UnableToWriteFile::atLocation('_probe/x', 'Access Denied'));
    Storage::set(DocumentUpload::DISK, $disk);
}

test('a storage failure is logged with context and told to the member, never a 500', function (): void {
    brokenDisk();
    Log::shouldReceive('error')->once()->withArgs(fn (string $message, array $context): bool => str_contains($message, 'stockage')
        && $context['disk'] === DocumentUpload::DISK
        && str_contains((string) $context['error'], 'Access Denied'));
    $list = listForFailure();

    $this->actingAs(User::factory()->create())
        ->from(route('tools.documents.show', $list))
        ->post(route('tools.documents.uploads.store', $list), [
            'person' => 0,
            'document' => 'payslips',
            'files' => [UploadedFile::fake()->create('paie.pdf', 10, 'application/pdf')],
        ])
        ->assertRedirect(route('tools.documents.show', $list))
        ->assertSessionHasErrors(['files' => 'Le fichier n’a pas pu être enregistré. Réessayez dans un instant ; si cela persiste, l’équipe en est informée.']);

    expect(DocumentUpload::query()->count())->toBe(0);
});

test('the client reads the same failure on the public page, in their language', function (): void {
    brokenDisk();
    Log::shouldReceive('error')->once();
    $list = listForFailure();
    $list->forceFill(['language' => 'en'])->save();

    $this->withSession(['document_access.'.$list->id => true])
        ->from(route('documents.public.show', $list->public_token))
        ->post(route('documents.public.store', $list->public_token), [
            'person' => 0,
            'document' => 'payslips',
            'files' => [UploadedFile::fake()->create('payslip.pdf', 10, 'application/pdf')],
        ])
        ->assertRedirect(route('documents.public.show', $list->public_token))
        ->assertSessionHasErrors(['files']);
});

test('storage:check reports each disk and the PHP limits, and fails when a disk refuses to write', function (): void {
    Storage::fake('local');
    Storage::fake('public');

    $this->artisan('storage:check')
        ->expectsOutputToContain('Écriture sur « local »')
        ->expectsOutputToContain('Taille acceptée par PHP')
        ->assertSuccessful();

    brokenDisk();
    $checks = resolve(CheckStorageSetup::class)->handle();

    expect(CheckStorageSetup::failed($checks))->toBeTrue()
        ->and(collect($checks)->firstWhere('check', 'Écriture sur « local »')['detail'])->toContain('Access Denied');
});

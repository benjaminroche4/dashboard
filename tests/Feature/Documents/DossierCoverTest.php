<?php

declare(strict_types=1);

use App\Actions\Documents\BuildDossierArchive;
use App\Actions\Documents\RenderDossierCover;
use App\Enums\DocumentUploadStatus;
use App\Models\DocumentRequest;
use App\Models\DocumentUpload;
use App\Models\User;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;

/**
 * Liste à deux personnes : un locataire avec deux pièces déposées, un garant
 * sans rien. Les fichiers sont posés sur un disque simulé.
 */
function dossier(): DocumentRequest
{
    Storage::fake(DocumentUpload::DISK);

    $request = DocumentRequest::factory()->create([
        'first_name' => 'Léa',
        'last_name' => 'Durand',
        'persons' => [
            [
                'first_name' => 'Léa',
                'last_name' => 'Durand',
                'role' => 'tenant',
                'documents' => ['identity_document', 'rib', 'payslips'],
            ],
            [
                'first_name' => 'Marc',
                'last_name' => 'Durand',
                'role' => 'guarantor',
                'documents' => ['identity_document'],
            ],
        ],
    ]);

    foreach ([['identity_document', 'cni.pdf'], ['rib', 'rib.pdf']] as [$key, $name]) {
        $upload = DocumentUpload::factory()->for($request, 'request')->create([
            'person_index' => 0,
            'document_key' => $key,
            'original_name' => $name,
        ]);

        Storage::disk(DocumentUpload::DISK)->put($upload->path, "%PDF-1.4 {$name}");
    }

    return $request->refresh()->load('uploads');
}

test('the cover lists what was received and what is still missing, in the catalogue order', function (): void {
    $request = dossier();
    $persons = RenderDossierCover::persons($request);

    expect($persons)->toHaveCount(2)
        ->and($persons[0]['name'])->toBe('Léa Durand')
        ->and($persons[0]['role'])->toBe('Locataire')
        // Identité puis Finance : l'ordre du catalogue, pas celui du dépôt.
        ->and(array_column($persons[0]['received'], 'label'))->toBe(['RIB', 'Passeport ou carte d\'identité'])
        ->and($persons[0]['received'][0]['files'])->toBe(1)
        ->and($persons[0]['missing'])->toBe(['3 derniers bulletins de salaire'])
        // Le garant n'a rien déposé : tout est attendu.
        ->and($persons[1]['received'])->toBe([])
        ->and($persons[1]['missing'])->toBe(['Passeport ou carte d\'identité']);

    expect(RenderDossierCover::files($request))->toBe(2)
        ->and(RenderDossierCover::fileName($request))->toBe('dossier-lea-durand.pdf');
});

test('the cover page is a PDF, never revealing the deposit link nor its code', function (): void {
    Http::fake(['docraptor.com/*' => Http::response('%PDF-1.4 dossier', 200, ['Content-Type' => 'application/pdf'])]);
    config()->set('services.docraptor.key', 'doc-key');

    $request = dossier();
    $staff = User::factory()->create();

    // Hors connexion, la page de garde n'est pas accessible.
    $this->get(route('tools.documents.cover', $request))->assertRedirect(route('login'));

    $this->actingAs($staff)->get(route('tools.documents.cover', $request))
        ->assertOk()
        ->assertHeader('Content-Type', 'application/pdf')
        ->assertHeader('Content-Disposition', 'inline; filename="dossier-lea-durand.pdf"');

    Http::assertSent(function (Request $sent) use ($request): bool {
        $html = (string) ($sent['document_content'] ?? '');

        return str_contains($html, 'Dossier de location')
            && str_contains($html, 'Léa Durand')
            && str_contains($html, 'Marc Durand')
            && str_contains($html, 'Pièces jointes')
            && str_contains($html, 'Pièces encore attendues')
            // Ce document part chez un partenaire : ni lien de dépôt, ni code.
            && ! str_contains($html, $request->access_code)
            && ! str_contains($html, $request->public_token);
    });
});

test('the file page announces how many files can be merged', function (): void {
    config()->set('services.docraptor.key', 'doc-key');

    $this->actingAs(User::factory()->create())
        ->get(route('tools.documents.show', dossier()))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('request.uploads_count', 2)
            ->where('coverAvailable', true)
            // Chaque fichier porte son lien de téléchargement, dans l'ordre.
            ->has('request.persons.0.categories')
            ->where('request.persons.0.name', 'Léa Durand'));
});

test('the archive keeps every piece as it was deposited, ordered by person and catalogue', function (): void {
    $request = dossier();
    $staff = User::factory()->create();

    $this->get(route('tools.documents.archive', $request))->assertRedirect(route('login'));

    $response = $this->actingAs($staff)->get(route('tools.documents.archive', $request))
        ->assertOk()
        ->assertHeader('Content-Type', 'application/zip');

    expect($response->headers->get('Content-Disposition'))->toContain('dossier-lea-durand.zip');

    // Le zip est lu depuis le fichier envoyé, avant sa suppression.
    $path = tempnam(sys_get_temp_dir(), 'test-').'.zip';
    file_put_contents($path, $response->streamedContent());

    $zip = new ZipArchive;
    expect($zip->open($path))->toBeTrue();

    $entries = [];

    for ($index = 0; $index < $zip->numFiles; $index++) {
        $entries[] = $zip->getNameIndex($index);
    }

    $zip->close();
    unlink($path);

    // Un dossier par personne, les pièces numérotées dans l'ordre du
    // catalogue. Le garant n'a rien déposé : il n'a pas de dossier.
    expect($entries)->toBe([
        '01 - Léa Durand (Locataire)/01 - Finance - RIB.pdf',
        "01 - Léa Durand (Locataire)/02 - Identité - Passeport ou carte d'identité.pdf",
    ]);
});

test('the archive says so instead of failing when nothing was deposited', function (): void {
    $empty = DocumentRequest::factory()->create();

    $this->actingAs(User::factory()->create())
        ->get(route('tools.documents.archive', $empty))
        ->assertRedirect();
});

test('two files on the same piece are numbered, and a missing file is skipped', function (): void {
    $request = dossier();

    // Un second fichier sur la même pièce (recto/verso).
    $second = DocumentUpload::factory()->for($request, 'request')->create([
        'person_index' => 0,
        'document_key' => 'rib',
        'original_name' => 'rib-page2.pdf',
    ]);
    Storage::disk(DocumentUpload::DISK)->put($second->path, '%PDF-1.4 page2');

    // Une pièce dont le fichier a disparu du stockage : elle ne casse rien.
    DocumentUpload::factory()->for($request, 'request')->create([
        'person_index' => 0,
        'document_key' => 'payslips',
        'original_name' => 'fantome.pdf',
    ]);

    $entries = array_column(BuildDossierArchive::plan($request->refresh()->load('uploads')), 'entry');

    expect($entries)->toBe([
        '01 - Léa Durand (Locataire)/01 - Finance - RIB (1).pdf',
        '01 - Léa Durand (Locataire)/02 - Finance - RIB (2).pdf',
        "01 - Léa Durand (Locataire)/03 - Identité - Passeport ou carte d'identité.pdf",
        '01 - Léa Durand (Locataire)/04 - Travail - 3 derniers bulletins de salaire.pdf',
    ]);

    // Le fichier absent du stockage est sauté : l'archive part quand même.
    $path = resolve(BuildDossierArchive::class)->handle($request);
    $zip = new ZipArchive;
    $zip->open($path);
    expect($zip->numFiles)->toBe(3);
    $zip->close();
    unlink($path);
});

test('a refused piece leaves the archive, the cover and the count: it is not valid', function (): void {
    $request = dossier();
    $refused = $request->uploads->firstWhere('original_name', 'rib.pdf');
    $refused->forceFill([
        'status' => DocumentUploadStatus::Refused,
        'review_note' => 'Illisible.',
        'reviewed_at' => now(),
    ])->save();
    $request->refresh()->load('uploads');

    // L'archive n'emporte que la pièce validable.
    $names = array_map(fn (array $part): string => $part['entry'], BuildDossierArchive::plan($request));

    expect($names)->toHaveCount(1)
        ->and($names[0])->toContain('Passeport')
        ->and(implode(' ', $names))->not->toContain('RIB');

    // La page de garde la compte manquante, comme la page du client.
    $persons = RenderDossierCover::persons($request);

    expect(array_column($persons[0]['received'], 'label'))->not->toContain('RIB')
        ->and($persons[0]['missing'])->toContain('RIB')
        ->and(RenderDossierCover::files($request))->toBe(1);

    // La fiche annonce 2 fichiers reçus, mais 1 seul fusionnable.
    $this->actingAs(User::factory()->create())
        ->get(route('tools.documents.show', $request))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('request.uploads_count', 2)
            ->where('request.valid_uploads_count', 1)
            ->etc());
});

test('an archive of only refused pieces is refused, like an empty one', function (): void {
    $request = dossier();
    $request->uploads->each(fn (DocumentUpload $upload) => $upload->forceFill(['status' => DocumentUploadStatus::Refused, 'reviewed_at' => now()])->save());

    expect(fn () => resolve(BuildDossierArchive::class)->handle($request->refresh()->load('uploads')))
        ->toThrow(RuntimeException::class, 'Aucune pièce valide');
});

test('the archive route says so when every piece was refused', function (): void {
    $request = dossier();
    $staff = User::factory()->create();

    // Tout refusé : le menu est grisé, mais une page restée ouverte ne casse pas.
    $request->uploads->each(fn (DocumentUpload $upload) => $upload->forceFill(['status' => DocumentUploadStatus::Refused, 'reviewed_at' => now()])->save());

    $this->actingAs($staff)
        ->get(route('tools.documents.archive', $request))
        ->assertRedirect();
});

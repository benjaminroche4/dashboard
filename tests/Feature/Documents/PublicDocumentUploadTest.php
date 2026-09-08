<?php

declare(strict_types=1);

use App\Actions\Documents\RenderDocumentRequestPdf;
use App\Events\DashboardUpdated;
use App\Mail\DocumentUploadLinkSent;
use App\Models\DocumentRequest;
use App\Models\DocumentUpload;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;

beforeEach(function (): void {
    Event::fake([DashboardUpdated::class]);
    Storage::fake(DocumentUpload::DISK);
});

/** Déverrouille la page publique comme si le client avait saisi son code d'appairage. */
function unlock(DocumentRequest $request): void
{
    test()->withSession(['document_access.'.$request->id => true]);
}

test('every request has a public upload link found by its token, never by its id, in the client language', function (): void {
    $request = DocumentRequest::factory()->english()->create(['first_name' => 'John', 'last_name' => 'Doe', 'message' => 'Before Friday please.']);

    expect($request->public_token)->toHaveLength(48)
        ->and($request->publicUrl())->toEndWith('/depot/'.$request->public_token);
    unlock($request);

    $this->get($request->publicUrl())
        ->assertOk()
        ->assertHeader('X-Robots-Tag', 'noindex, nofollow, noarchive')
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('public/document-upload')
            ->where('request.name', 'John Doe')
            ->where('request.language', 'en')
            ->where('request.message', 'Before Friday please.')
            ->where('request.persons.0.index', 0)
            ->has('request.persons.0.categories.0.documents.0.key')
            ->where('request.persons.0.categories.0.documents.0.uploads', [])
            ->where('labels.title', 'Your supporting documents')
            ->missing('request.upload_url')
            ->where('auth.user', null));

    $this->get('/depot/'.$request->id)->assertNotFound();
    $this->get('/depot/'.$request->uuid)->assertNotFound();
    $this->get('/depot/not-a-token')->assertNotFound();
});

test('the client uploads files for a requested document, stored privately, listed on the page and announced to the team', function (): void {
    $request = DocumentRequest::factory()->create([
        'first_name' => 'Léa', 'last_name' => 'Durand',
        'persons' => [['first_name' => 'Léa', 'last_name' => 'Durand', 'role' => 'tenant', 'documents' => ['rib']]],
    ]);
    $key = 'rib';
    unlock($request);

    $this->post($request->publicUrl(), [
        'person' => 0,
        'document' => $key,
        'files' => [
            UploadedFile::fake()->create('passeport.pdf', 200, 'application/pdf'),
            UploadedFile::fake()->create('verso.pdf', 120, 'application/pdf'),
        ],
    ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $uploads = $request->uploads()->get();
    expect($uploads)->toHaveCount(2)
        ->and($uploads->first()->document_key)->toBe($key)
        ->and($uploads->first()->original_name)->toBe('passeport.pdf')
        ->and($uploads->first()->path)->toStartWith("document-uploads/{$request->uuid}/0/{$key}/");
    Storage::disk(DocumentUpload::DISK)->assertExists($uploads->first()->path);
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->resource === 'documents'
        && $event->actor === null
        && str_contains((string) $event->message, 'Léa Durand a déposé 2 fichiers'));

    $this->get($request->publicUrl())
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->has('request.persons.0.categories.0.documents.0.uploads', 2)
            ->where('request.persons.0.categories.0.documents.0.uploads.0.name', 'passeport.pdf'));
});

test('uploads are validated: a requested document, PDF only, ten files of ten megabytes at most', function (): void {
    $request = DocumentRequest::factory()->create();
    $key = $request->persons[0]['documents'][0];
    unlock($request);

    $this->from($request->publicUrl())
        ->post($request->publicUrl(), ['person' => 0, 'document' => 'not_requested', 'files' => [UploadedFile::fake()->create('a.pdf', 10, 'application/pdf')]])
        ->assertRedirect($request->publicUrl())
        ->assertSessionHasErrors(['document']);

    $this->post($request->publicUrl(), ['person' => 3, 'document' => $key, 'files' => [UploadedFile::fake()->create('a.pdf', 10, 'application/pdf')]])
        ->assertSessionHasErrors(['document']);

    $this->post($request->publicUrl(), ['person' => 0, 'document' => $key, 'files' => [UploadedFile::fake()->create('virus.exe', 10, 'application/octet-stream')]])
        ->assertSessionHasErrors(['files.0']);

    $this->post($request->publicUrl(), ['person' => 0, 'document' => $key, 'files' => [UploadedFile::fake()->image('photo.jpg')]])
        ->assertSessionHasErrors(['files.0']);

    $this->post($request->publicUrl(), ['person' => 0, 'document' => $key, 'files' => [UploadedFile::fake()->create('big.pdf', 11_000, 'application/pdf')]])
        ->assertSessionHasErrors(['files.0']);

    $this->post($request->publicUrl(), ['person' => 0, 'document' => $key, 'files' => []])
        ->assertSessionHasErrors(['files']);

    expect(DocumentUpload::query()->count())->toBe(0);
});

test('the team sees the public link and the received files on the request page, downloads and deletes them', function (): void {
    $request = DocumentRequest::factory()->create([
        'persons' => [['first_name' => 'Léa', 'last_name' => 'Durand', 'role' => 'tenant', 'documents' => ['rib']]],
    ]);
    $key = 'rib';
    Storage::disk(DocumentUpload::DISK)->put("document-uploads/{$request->uuid}/0/{$key}/abc.pdf", '%PDF-1.4');
    $upload = DocumentUpload::factory()->create([
        'document_request_id' => $request->id,
        'document_key' => $key,
        'original_name' => 'passeport.pdf',
        'path' => "document-uploads/{$request->uuid}/0/{$key}/abc.pdf",
    ]);
    $member = User::factory()->create();

    $this->get(route('tools.documents.uploads.download', [$request, $upload]))->assertRedirect(route('login'));

    $this->actingAs($member)
        ->get(route('tools.documents.show', $request))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('request.public_url', $request->publicUrl())
            ->where('request.uploads_count', 1)
            ->where('request.persons.0.categories.0.documents.0.uploads.0.name', 'passeport.pdf')
            ->where('request.persons.0.categories.0.documents.0.uploads.0.download_url', route('tools.documents.uploads.download', [$request, $upload])));

    $this->actingAs($member)
        ->get(route('tools.documents.uploads.download', [$request, $upload]))
        ->assertOk()
        ->assertDownload('passeport.pdf');

    // Un fichier d'une autre liste n'est pas accessible par cette liste.
    $other = DocumentRequest::factory()->create();
    $this->actingAs($member)->get(route('tools.documents.uploads.download', [$other, $upload]))->assertNotFound();

    $this->actingAs($member)
        ->delete(route('tools.documents.uploads.destroy', [$request, $upload]))
        ->assertRedirect();
    expect(DocumentUpload::query()->count())->toBe(0);
    Storage::disk(DocumentUpload::DISK)->assertMissing("document-uploads/{$request->uuid}/0/{$key}/abc.pdf");
});

test('the PDF and the request link the public upload page, the external folder being optional', function (): void {
    $request = DocumentRequest::factory()->create(['upload_url' => null]);

    $this->actingAs(User::factory()->create())
        ->post(route('tools.documents.store'), [
            'language' => 'fr',
            'persons' => [['first_name' => 'Léa', 'last_name' => 'Durand', 'role' => 'tenant', 'documents' => ['rib']]],
        ])
        ->assertSessionHasNoErrors();

    $created = DocumentRequest::query()->latest('id')->first();
    expect($created->upload_url)->toBeNull()
        ->and($created->public_token)->toHaveLength(48);

    expect($created->access_code)->toMatch('/^\d{6}$/');

    $html = view('documents.request', [
        'request' => $request,
        'fr' => true,
        'persons' => RenderDocumentRequestPdf::persons($request),
        'company' => config('company'),
        'logo' => null,
    ])->render();
    expect($html)->toContain($request->publicUrl())
        ->toContain($request->access_code)
        ->not->toContain('dossier partagé');
});

test('the public page asks for the pairing code first, unlocks the session with the right one and refuses uploads before', function (): void {
    $request = DocumentRequest::factory()->create([
        'access_code' => '482913',
        'persons' => [['first_name' => 'Léa', 'last_name' => 'Durand', 'role' => 'tenant', 'documents' => ['rib']]],
    ]);

    $this->get($request->publicUrl())
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('public/document-code')
            ->where('request.name', $request->fullName())
            ->has('labels.code'));

    $this->post($request->publicUrl(), ['person' => 0, 'document' => 'rib', 'files' => [UploadedFile::fake()->create('a.pdf', 10, 'application/pdf')]])
        ->assertForbidden();

    $this->from($request->publicUrl())
        ->post(route('documents.public.verify', ['documentRequest' => $request->public_token]), ['code' => '000000'])
        ->assertRedirect($request->publicUrl())
        ->assertSessionHasErrors(['code']);

    $this->post(route('documents.public.verify', ['documentRequest' => $request->public_token]), ['code' => '12'])
        ->assertSessionHasErrors(['code']);

    $this->post(route('documents.public.verify', ['documentRequest' => $request->public_token]), ['code' => '482913'])
        ->assertRedirect($request->publicUrl())
        ->assertSessionHasNoErrors();

    $this->get($request->publicUrl())
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page->component('public/document-upload'));

    $this->post($request->publicUrl(), ['person' => 0, 'document' => 'rib', 'files' => [UploadedFile::fake()->create('a.pdf', 10, 'application/pdf')]])
        ->assertRedirect()
        ->assertSessionHasNoErrors();
    expect(DocumentUpload::query()->count())->toBe(1);
});

test('the team emails the upload link and pairing code to the client in the list language, which is noted on the lead', function (): void {
    Mail::fake();
    $member = User::factory()->create();
    $lead = Lead::factory()->create(['email' => 'lea@example.com']);
    $request = DocumentRequest::factory()->english()->create(['lead_id' => $lead->id, 'first_name' => 'Léa', 'last_name' => 'Durand', 'access_code' => '482913']);

    $this->actingAs($member)
        ->get(route('tools.documents.show', $request))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('request.access_code', '482913')
            ->where('request.lead_email', 'lea@example.com')
            ->where('request.link_sent_at', null));

    $this->actingAs($member)
        ->post(route('tools.documents.send-link', $request), ['email' => 'pas-un-email'])
        ->assertSessionHasErrors(['email']);

    $this->actingAs($member)
        ->post(route('tools.documents.send-link', $request), ['email' => 'lea@example.com'])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    Mail::assertSent(DocumentUploadLinkSent::class, function (DocumentUploadLinkSent $mail) use ($request): bool {
        $mail->locale('en');
        $html = $mail->render();

        return $mail->hasTo('lea@example.com')
            && $mail->locale === 'en'
            && str_contains($html, $request->publicUrl())
            && str_contains($html, '482913')
            && str_contains($html, 'pairing code');
    });

    expect($request->refresh()->link_sent_to)->toBe('lea@example.com')
        ->and($request->link_sent_at)->not->toBeNull()
        ->and($lead->refresh()->notes()->latest()->value('body'))->toBe('Lien de dépôt des pièces envoyé à lea@example.com.')
        ->and($lead->last_contacted_at)->not->toBeNull();
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => str_contains((string) $event->message, 'lien de dépôt'));
});

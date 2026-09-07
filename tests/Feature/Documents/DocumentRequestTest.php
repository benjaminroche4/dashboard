<?php

declare(strict_types=1);

use App\Events\DashboardUpdated;
use App\Models\DocumentRequest;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia;

test('guests are redirected to the login page', function (): void {
    $this->get(route('tools.documents.index'))->assertRedirect(route('login'));
    $this->get(route('tools.documents.create'))->assertRedirect(route('login'));
});

test('the create page exposes the catalog, roles and languages', function (): void {
    $this->actingAs(User::factory()->create())
        ->get(route('tools.documents.create'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('documents/create')
            ->has('catalog', 7)
            ->where('catalog.0.label', 'Études')
            ->has('roles', 2)
            ->has('languages', 2));
});

test('a staff member creates a request and lands on its page', function (): void {
    Event::fake([DashboardUpdated::class]);
    config()->set('services.docraptor.key');
    $staff = User::factory()->create();

    $this->actingAs($staff)
        ->post(route('tools.documents.store'), [
            'language' => 'en',
            'message' => 'Merci !',
            'upload_url' => 'https://drive.google.com/drive/folders/abc',
            'persons' => [
                ['first_name' => 'Léa', 'last_name' => 'Martin', 'role' => 'tenant', 'documents' => ['identity_document', 'payslips']],
                ['first_name' => 'Paul', 'last_name' => 'Martin', 'role' => 'guarantor', 'documents' => ['tax_notices']],
            ],
        ])
        ->assertRedirect(route('tools.documents.show', DocumentRequest::query()->firstOrFail()));

    $request = DocumentRequest::query()->firstOrFail();

    expect($request->created_by)->toBe($staff->id)
        ->and($request->language->value)->toBe('en')
        ->and($request->documentCount())->toBe(3);

    $this->actingAs($staff)
        ->get(route('tools.documents.show', $request))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('documents/show')
            ->where('request.name', 'Léa Martin')
            ->missing('request.email')
            ->where('request.persons.1.name', 'Paul Martin')
            ->where('request.persons.1.role', 'Garant')
            ->where('request.persons.0.categories.0.label', 'Identité')
            ->where('request.persons.0.categories.1.label', 'Travail')
            ->where('request.persons.0.categories.1.documents.0.label', '3 derniers bulletins de salaire')
            ->where('pdfAvailable', false));
});

test('validation requires a name per person, an https link, one to four persons each with documents from the catalog', function (): void {
    $this->actingAs(User::factory()->create())
        ->from(route('tools.documents.create'))
        ->post(route('tools.documents.store'), [
            'language' => 'fr',
            'upload_url' => 'http://insecure.example',
            'persons' => [
                ['first_name' => '', 'last_name' => '', 'role' => 'tenant', 'documents' => []],
                ['first_name' => 'Paul', 'last_name' => 'Martin', 'role' => 'nobody', 'documents' => ['not_in_catalog']],
            ],
        ])
        ->assertRedirect(route('tools.documents.create'))
        ->assertSessionHasErrors(['upload_url', 'persons.0.first_name', 'persons.0.last_name', 'persons.0.documents', 'persons.1.role', 'persons.1.documents.0']);

    $this->actingAs(User::factory()->create())
        ->post(route('tools.documents.store'), [
            'language' => 'fr', 'upload_url' => 'https://x.test',
            'persons' => array_fill(0, 5, ['first_name' => 'A', 'last_name' => 'B', 'role' => 'tenant', 'documents' => ['rib']]),
        ])
        ->assertSessionHasErrors(['persons']);
});

test('the index lists requests newest first', function (): void {
    DocumentRequest::factory()->create(['first_name' => 'Ancienne', 'created_at' => now()->subDay()]);
    DocumentRequest::factory()->create(['first_name' => 'Récente']);

    $this->actingAs(User::factory()->create())
        ->get(route('tools.documents.index'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('documents/index')
            ->has('requests', 2)
            ->where('requests.0.first_name', 'Récente')
            ->where('requests.1.first_name', 'Ancienne'));
});

test('the PDF is generated through DocRaptor in the client language', function (): void {
    config()->set('services.docraptor.key', 'test-key');
    Http::fake(['api.docraptor.com/*' => Http::response('%PDF-1.4 fake', 200)]);
    $request = DocumentRequest::factory()->english()->create(['first_name' => 'John', 'last_name' => 'Doe']);

    $this->actingAs(User::factory()->create())
        ->get(route('tools.documents.pdf', $request))
        ->assertOk()
        ->assertHeader('Content-Type', 'application/pdf')
        ->assertHeader('Content-Disposition', 'attachment; filename="documents-john-doe.pdf"');

    Http::assertSent(fn ($apiRequest): bool => str_contains((string) $apiRequest->data()['document_content'], 'Documents to provide'));
});

test('the edit page prefills the form and a staff member updates the request', function (): void {
    Event::fake([DashboardUpdated::class]);
    $request = DocumentRequest::factory()->withGuarantor()->create(['first_name' => 'Léa', 'last_name' => 'Martin']);
    $staff = User::factory()->create();

    $this->actingAs($staff)
        ->get(route('tools.documents.edit', $request))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('documents/create')
            ->has('catalog', 7)
            ->where('request.id', $request->id)
            ->where('request.name', 'Léa Martin')
            ->where('request.persons.0.first_name', $request->persons[0]['first_name'])
            ->where('request.persons.1.role', 'guarantor'));

    $this->actingAs($staff)
        ->put(route('tools.documents.update', $request), [
            'language' => 'en',
            'message' => null,
            'upload_url' => 'https://drive.google.com/new',
            'persons' => [
                ['first_name' => 'Léa', 'last_name' => 'Durand', 'role' => 'tenant', 'documents' => ['rib']],
            ],
        ])
        ->assertRedirect(route('tools.documents.show', $request));

    $request->refresh();

    expect($request->last_name)->toBe('Durand')
        ->and($request->language->value)->toBe('en')
        ->and($request->upload_url)->toBe('https://drive.google.com/new')
        ->and($request->persons)->toHaveCount(1);
});

test('only admins delete a request', function (): void {
    Event::fake([DashboardUpdated::class]);
    $request = DocumentRequest::factory()->create();

    $this->actingAs(User::factory()->create())
        ->delete(route('tools.documents.destroy', $request))
        ->assertForbidden();

    $this->actingAs(User::factory()->admin()->create())
        ->delete(route('tools.documents.destroy', $request))
        ->assertRedirect(route('tools.documents.index'));

    expect(DocumentRequest::query()->count())->toBe(0);
});

test('bulk deletion is reserved to admins', function (): void {
    Event::fake([DashboardUpdated::class]);
    $requests = DocumentRequest::factory()->count(2)->create();
    $ids = $requests->pluck('id')->all();

    $this->actingAs(User::factory()->create())
        ->delete(route('tools.documents.bulk-destroy'), ['ids' => $ids])
        ->assertForbidden();
    expect(DocumentRequest::query()->count())->toBe(2);

    $this->actingAs(User::factory()->admin()->create())
        ->from(route('tools.documents.index'))
        ->delete(route('tools.documents.bulk-destroy'), ['ids' => $ids])
        ->assertRedirect(route('tools.documents.index'));
    expect(DocumentRequest::query()->count())->toBe(0);
});

test('bulk requests validate the ids', function (): void {
    $this->actingAs(User::factory()->admin()->create())
        ->from(route('tools.documents.index'))
        ->delete(route('tools.documents.bulk-destroy'), ['ids' => [999_999]])
        ->assertSessionHasErrors(['ids.0']);
});

test('creating a list from a lead prefills the first person and links the list', function (): void {
    Event::fake([DashboardUpdated::class]);
    $staff = User::factory()->create();
    $lead = Lead::factory()->create(['first_name' => 'Léa', 'last_name' => 'Durand', 'language' => 'en']);

    $this->actingAs($staff)->get(route('tools.documents.create', ['lead' => $lead->uuid]))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('prefill.lead_id', $lead->id)
            ->where('prefill.lead_name', 'Léa Durand')
            ->where('prefill.first_name', 'Léa')
            ->where('prefill.language', 'en'));
    $this->actingAs($staff)->get(route('tools.documents.create'))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page->where('prefill', null));

    $this->actingAs($staff)->post(route('tools.documents.store'), [
        'lead_id' => $lead->id,
        'language' => 'en',
        'upload_url' => 'https://drive.google.com/x',
        'persons' => [['first_name' => 'Léa', 'last_name' => 'Durand', 'role' => 'tenant', 'documents' => ['rib']]],
    ])->assertSessionHasNoErrors();

    $request = DocumentRequest::query()->firstOrFail();

    expect($request->lead_id)->toBe($lead->id)
        ->and($lead->documentRequests()->count())->toBe(1);

    $this->actingAs($staff)->get(route('tools.documents.show', $request))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('request.lead.id', $lead->id)
            ->where('request.lead.name', 'Léa Durand'));

    $this->actingAs($staff)->get(route('leads.show', $lead))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->has('documentRequests', 1)
            ->where('documentRequests.0.name', 'Léa Durand')
            ->where('documentRequests.0.document_count', 1));
});

test('document request routes use the UUID and refuse the numeric id', function (): void {
    $staff = User::factory()->staff()->create();
    $request = DocumentRequest::factory()->create();

    expect($request->uuid)->not->toBeNull()
        ->and(Str::isUuid($request->uuid))->toBeTrue()
        ->and(route('tools.documents.show', $request))->toEndWith('/tools/documents/'.$request->uuid)
        ->and(route('tools.documents.show', $request))->not->toContain('/tools/documents/'.$request->id)
        ->and(route('tools.documents.pdf', $request))->toEndWith('/tools/documents/'.$request->uuid.'/pdf')
        ->and(route('tools.documents.edit', $request))->toEndWith('/tools/documents/'.$request->uuid.'/edit');

    $this->actingAs($staff)
        ->get('/tools/documents/'.$request->uuid)
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('documents/show')
            ->where('request.id', $request->id)
            ->where('request.uuid', $request->uuid));

    $this->actingAs($staff)->get('/tools/documents/'.$request->id)->assertNotFound();
    $this->actingAs($staff)->get('/tools/documents/'.$request->id.'/edit')->assertNotFound();
    $this->actingAs($staff)->get('/tools/documents/'.$request->id.'/pdf')->assertNotFound();
    $this->actingAs($staff)->get('/tools/documents/'.Str::uuid())->assertNotFound();

    $this->actingAs($staff)
        ->get(route('tools.documents.index'))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('requests.0.uuid', $request->uuid));
});

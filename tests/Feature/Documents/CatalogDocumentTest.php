<?php

declare(strict_types=1);

use App\Events\DashboardUpdated;
use App\Models\CatalogDocument;
use App\Models\User;
use App\Support\DocumentCatalog;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia;

test('the catalog page is reserved to admins and lists every category with its documents', function (): void {
    $this->actingAs(User::factory()->create())
        ->get(route('tools.documents.catalog.index'))
        ->assertForbidden();

    $this->actingAs(User::factory()->admin()->create())
        ->get(route('tools.documents.catalog.index'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('documents/catalog')
            ->has('groups', 7)
            ->where('groups.4.label', 'Identité')
            ->where('groups.4.items.0.key', 'identity_document')
            ->where('groups.4.items.0.label_en', 'Passport or ID card')
            ->has('categories', 7));
});

test('an admin adds, edits and removes a document, and the catalog follows', function (): void {
    Event::fake([DashboardUpdated::class]);
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)
        ->from(route('tools.documents.catalog.index'))
        ->post(route('tools.documents.catalog.store'), [
            'category' => 'work',
            'label' => 'Attestation de télétravail',
            'label_en' => 'Remote work certificate',
            'hint' => '  Signée par les RH  ',
            'hint_en' => '',
        ])
        ->assertRedirect(route('tools.documents.catalog.index'))
        ->assertSessionHasNoErrors();

    $document = CatalogDocument::query()->where('key', 'attestation_de_teletravail')->firstOrFail();

    expect($document->category->value)->toBe('work')
        ->and($document->hint)->toBe('Signée par les RH')
        ->and($document->hint_en)->toBeNull()
        ->and($document->position)->toBe(17)
        ->and(DocumentCatalog::has('attestation_de_teletravail'))->toBeTrue()
        ->and(DocumentCatalog::label('attestation_de_teletravail'))->toBe('Attestation de télétravail');

    $this->actingAs($admin)
        ->patch(route('tools.documents.catalog.update', $document), [
            'category' => 'other',
            'label' => 'Attestation de télétravail (RH)',
            'label_en' => null,
            'hint' => null,
            'hint_en' => null,
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $document->refresh();

    expect($document->key)->toBe('attestation_de_teletravail')
        ->and($document->category->value)->toBe('other')
        ->and($document->position)->toBe(4)
        ->and($document->label)->toBe('Attestation de télétravail (RH)');

    $this->actingAs($admin)
        ->delete(route('tools.documents.catalog.destroy', $document))
        ->assertRedirect();

    expect(CatalogDocument::query()->whereKey($document->id)->exists())->toBeFalse()
        ->and(DocumentCatalog::has('attestation_de_teletravail'))->toBeFalse()
        ->and(DocumentCatalog::label('attestation_de_teletravail'))->toBe('attestation_de_teletravail');
});

test('members cannot write the catalog and the payload is validated', function (): void {
    $document = CatalogDocument::query()->where('key', 'rib')->firstOrFail();

    $this->actingAs(User::factory()->create())
        ->post(route('tools.documents.catalog.store'), ['category' => 'work', 'label' => 'X'])
        ->assertForbidden();
    $this->actingAs(User::factory()->create())
        ->delete(route('tools.documents.catalog.destroy', $document))
        ->assertForbidden();

    $this->actingAs(User::factory()->admin()->create())
        ->from(route('tools.documents.catalog.index'))
        ->post(route('tools.documents.catalog.store'), ['category' => 'nope', 'label' => ''])
        ->assertRedirect(route('tools.documents.catalog.index'))
        ->assertSessionHasErrors(['category', 'label']);
});

test('a new catalog document is accepted by the list form', function (): void {
    Event::fake([DashboardUpdated::class]);
    $document = CatalogDocument::factory()->create(['key' => 'custom_piece', 'label' => 'Pièce maison']);

    $this->actingAs(User::factory()->create())
        ->post(route('tools.documents.store'), [
            'language' => 'fr',
            'upload_url' => 'https://drive.google.com/x',
            'persons' => [['first_name' => 'Léa', 'last_name' => 'Martin', 'role' => 'tenant', 'documents' => [$document->key]]],
        ])
        ->assertSessionHasNoErrors();
});

test('catalog document routes use the UUID and refuse the numeric id', function (): void {
    $admin = User::factory()->admin()->create();
    $document = CatalogDocument::factory()->create();

    expect($document->uuid)->not->toBeNull()
        ->and(Str::isUuid($document->uuid))->toBeTrue()
        ->and(route('tools.documents.catalog.update', $document))->toEndWith('/tools/documents/catalog/'.$document->uuid)
        ->and(route('tools.documents.catalog.update', $document))->not->toContain('/tools/documents/catalog/'.$document->id);

    $payload = ['category' => $document->category->value, 'label' => 'Libellé modifié', 'label_en' => null, 'hint' => null, 'hint_en' => null];

    $this->actingAs($admin)->patch('/tools/documents/catalog/'.$document->id, $payload)->assertNotFound();
    $this->actingAs($admin)->delete('/tools/documents/catalog/'.$document->id)->assertNotFound();
    $this->actingAs($admin)->patch('/tools/documents/catalog/'.Str::uuid(), $payload)->assertNotFound();

    $this->actingAs($admin)
        ->from(route('tools.documents.catalog.index'))
        ->patch('/tools/documents/catalog/'.$document->uuid, $payload)
        ->assertRedirect(route('tools.documents.catalog.index'));

    expect($document->fresh()?->label)->toBe('Libellé modifié');

    $this->actingAs($admin)
        ->get(route('tools.documents.catalog.index'))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('groups', fn (Collection $groups): bool => $groups->flatMap(fn (array $group): array => $group['items'])->contains('uuid', $document->uuid)));
});

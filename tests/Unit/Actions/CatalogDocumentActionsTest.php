<?php

declare(strict_types=1);

use App\Actions\Documents\CreateCatalogDocument;
use App\Actions\Documents\DeleteCatalogDocument;
use App\Actions\Documents\UpdateCatalogDocument;
use App\Data\CatalogDocumentData;
use App\Enums\DocumentCategory;
use App\Events\DashboardUpdated;
use App\Models\CatalogDocument;
use App\Support\DocumentCatalog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

test('the DTO normalises blanks and casts the category', function (): void {
    $data = CatalogDocumentData::from(['category' => 'finance', 'label' => ' RIB pro ', 'label_en' => '', 'hint' => '  ', 'hint_en' => 'Pro']);

    expect($data->category)->toBe(DocumentCategory::Finance)
        ->and($data->label)->toBe('RIB pro')
        ->and($data->labelEn)->toBeNull()
        ->and($data->hint)->toBeNull()
        ->and($data->toArray()['hint_en'])->toBe('Pro');
});

test('creating derives a unique key, appends to the category and refreshes the catalog', function (): void {
    Event::fake([DashboardUpdated::class]);
    $data = CatalogDocumentData::from(['category' => 'finance', 'label' => 'RIB']);

    $first = (new CreateCatalogDocument)->handle($data);
    $second = (new CreateCatalogDocument)->handle($data);

    expect($first->key)->toBe('rib_2')
        ->and($second->key)->toBe('rib_3')
        ->and($first->position)->toBe(20)
        ->and($second->position)->toBe(21)
        ->and(array_slice(DocumentCatalog::keys(), -2))->not->toContain('rib_2');

    $finance = collect(DocumentCatalog::grouped())->firstWhere('value', 'finance');

    expect(end($finance['items'])['key'])->toBe('rib_3');
    Event::assertDispatchedTimes(DashboardUpdated::class, 2);
});

test('updating keeps the key and moves to the end of a new category; deleting removes it', function (): void {
    Event::fake([DashboardUpdated::class]);
    $document = CatalogDocument::query()->where('key', 'rib')->firstOrFail();

    $updated = (new UpdateCatalogDocument)->handle($document, CatalogDocumentData::from(['category' => 'identity', 'label' => 'RIB français']));

    expect($updated->key)->toBe('rib')
        ->and($updated->position)->toBe(8)
        ->and(DocumentCatalog::label('rib'))->toBe('RIB français');

    (new DeleteCatalogDocument)->handle($updated);

    expect(DocumentCatalog::has('rib'))->toBeFalse();
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => ($event->payload['deleted'] ?? false) === true);
});

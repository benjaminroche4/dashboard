<?php

declare(strict_types=1);

use App\Enums\DocumentCategory;
use App\Enums\HouseholdRole;
use App\Support\DocumentCatalog;
use Tests\TestCase;

uses(TestCase::class);

test('the catalog has unique keys in every category and is grouped for the front', function (): void {
    $all = DocumentCatalog::all();
    $grouped = DocumentCatalog::grouped();

    expect($all)->toHaveCount(58)
        ->and(DocumentCatalog::keys())->toBe(array_keys($all))
        ->and(DocumentCatalog::has('payslips'))->toBeTrue()
        ->and(DocumentCatalog::has('unknown'))->toBeFalse()
        ->and(array_column($grouped, 'value'))->toBe(array_map(fn (DocumentCategory $c): string => $c->value, DocumentCategory::cases()))
        ->and(array_sum(array_map(fn (array $group): int => count($group['items']), $grouped)))->toBe(58)
        ->and($grouped[4]['label'])->toBe('Identité')
        ->and($grouped[4]['items'][0])->toBe(['key' => 'identity_document', 'label' => 'Passeport ou carte d\'identité', 'hint' => 'Recto et verso']);
});

test('every label and hint is translated in English', function (): void {
    $en = json_decode((string) file_get_contents(lang_path('en.json')), true);
    $missing = [];

    foreach (DocumentCatalog::all() as $entry) {
        foreach ([$entry['label'], $entry['hint']] as $text) {
            if ($text !== null && ! isset($en[$text])) {
                $missing[] = $text;
            }
        }
    }

    expect($missing)->toBe([]);
});

test('labels and hints follow the current locale', function (): void {
    expect(DocumentCatalog::label('payslips'))->toBe('3 derniers bulletins de salaire')
        ->and(DocumentCatalog::hint('balance_sheets'))->toBeNull();

    app()->setLocale('en');

    expect(DocumentCatalog::label('payslips'))->toBe('Last 3 payslips')
        ->and(DocumentCatalog::hint('identity_document'))->toBe('Front and back');
});

test('household roles expose labels and options', function (): void {
    expect(HouseholdRole::Tenant->label())->toBe('Locataire')
        ->and(HouseholdRole::options())->toBe([
            ['value' => 'tenant', 'label' => 'Locataire'],
            ['value' => 'guarantor', 'label' => 'Garant'],
        ]);
});

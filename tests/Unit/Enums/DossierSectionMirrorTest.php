<?php

declare(strict_types=1);

use App\Enums\DocumentCategory;
use App\Enums\DossierSection;
use App\Support\DocumentCatalog;

test('the front mirror of the dossier parts lists the same themes, in the same order', function (): void {
    $mirror = file_get_contents(dirname(__DIR__, 3).'/resources/js/lib/dossier-sections.ts');

    expect($mirror)->not->toBeFalse();

    $positions = [];

    foreach (DossierSection::cases() as $case) {
        $needle = "value: '{$case->value}'";
        expect($mirror)->toContain($needle)->toContain($case->label());
        $positions[] = strpos((string) $mirror, $needle);
    }

    // Même ordre : c'est lui qui range le dossier des deux côtés.
    $sorted = $positions;
    sort($sorted);
    expect($positions)->toBe($sorted)
        ->and(substr_count((string) $mirror, "value: '"))->toBe(count(DossierSection::cases()));
});

test('every default piece of the catalogue has a dossier part, and an unknown piece follows its category', function (): void {
    foreach (DocumentCatalog::defaults() as $category => $documents) {
        foreach (array_keys($documents) as $key) {
            expect(DossierSection::forDocument($key, DocumentCategory::from($category)))->toBeInstanceOf(DossierSection::class);
        }
    }

    // Les impôts et l'épargne sortent de « Finance », les salaires de « Travail ».
    expect(DossierSection::forDocument('tax_notices', DocumentCategory::Finance))->toBe(DossierSection::Taxes)
        ->and(DossierSection::forDocument('savings_statement', DocumentCategory::Finance))->toBe(DossierSection::Savings)
        ->and(DossierSection::forDocument('payslips', DocumentCategory::Work))->toBe(DossierSection::Income)
        ->and(DossierSection::forDocument('piece_maison', DocumentCategory::Work))->toBe(DossierSection::Employment)
        ->and(DossierSection::Identity->rank())->toBeLessThan(DossierSection::Income->rank());
});

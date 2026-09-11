<?php

declare(strict_types=1);

use App\Support\PropertyAddress;

test('two spellings of the same address share one key', function (): void {
    $key = PropertyAddress::key('53, rue Christelle Lefort', '75018', 'Paris');

    expect(PropertyAddress::key('53 rue christelle-lefort', '75018', 'paris'))->toBe($key)
        ->and(PropertyAddress::key('  53 Rue  Christelle Lefort ', '75018', 'PARIS'))->toBe($key)
        ->and(PropertyAddress::key('53, rue Christelle Lefort', '75011', 'Paris'))->not->toBe($key)
        ->and(PropertyAddress::key('54, rue Christelle Lefort', '75018', 'Paris'))->not->toBe($key);
});

test('accents and apostrophes do not separate two identical addresses', function (): void {
    expect(PropertyAddress::key("12 avenue de l'Opéra", '75001'))
        ->toBe(PropertyAddress::key('12 avenue de l Opera', '75001'));
});

test('an empty street has no key', function (): void {
    expect(PropertyAddress::key(null))->toBeNull()
        ->and(PropertyAddress::key('   '))->toBeNull();
});

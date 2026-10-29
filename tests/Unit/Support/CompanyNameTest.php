<?php

declare(strict_types=1);

use App\Support\CompanyName;

test('the key ignores case, accents, punctuation and legal forms', function (): void {
    expect(CompanyName::key('Nestlé S.A.'))->toBe('nestle')
        ->and(CompanyName::key('NESTLE SA'))->toBe('nestle')
        ->and(CompanyName::key('Guilbert Pierre S.A.R.L.'))->toBe('guilbertpierre')
        ->and(CompanyName::key('The Boring Company Ltd'))->toBe('boringcompany')
        // Un nom fait seulement d'une forme juridique garde ses mots.
        ->and(CompanyName::key('SA'))->toBe('sa');
});

test('similar names are recognised, distinct ones are not', function (): void {
    expect(CompanyName::similar('Nestlé S.A.', 'nestle'))->toBeTrue()
        ->and(CompanyName::similar('Guilbert Pierre SARL', 'Guilbert-Pierre'))->toBeTrue()
        ->and(CompanyName::similar('Nestlé', 'Nestlee'))->toBeTrue()
        ->and(CompanyName::similar('Microsoft France', 'Microsof France'))->toBeTrue()
        ->and(CompanyName::similar('Nestlé', 'Danone'))->toBeFalse()
        // Un nom court n'a pas de tolérance : « Axa » n'est pas « Aza ».
        ->and(CompanyName::similar('Axa', 'Aza'))->toBeFalse()
        ->and(CompanyName::similar('', 'Nestlé'))->toBeFalse();
});

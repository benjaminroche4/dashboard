<?php

declare(strict_types=1);

use App\Support\PersonName;

test('it capitalises each word, after hyphens and apostrophes, and trims spaces', function (string $input, string $expected): void {
    expect(PersonName::capitalize($input))->toBe($expected);
})->with([
    ['benjamin', 'Benjamin'],
    ['  roche ', 'Roche'],
    ['BENJAMIN ROCHE', 'Benjamin Roche'],
    ['jean-pierre', 'Jean-Pierre'],
    ["d'arc", "D'Arc"],
    ['de la  tour', 'De La Tour'],
    ['éléonore', 'Éléonore'],
    ['', ''],
]);

<?php

declare(strict_types=1);

use App\Enums\PropertyApplicationStatus;

test('the front mirror of the outcomes lists the same steps, in the same order', function (): void {
    $mirror = file_get_contents(dirname(__DIR__, 3).'/resources/js/lib/property-outcomes.ts');

    expect($mirror)->not->toBeFalse();

    foreach (PropertyApplicationStatus::cases() as $case) {
        expect($mirror)->toContain("'{$case->value}'")
            ->and($mirror)->toContain($case->label())
            ->and($mirror)->toContain($case->hint());
    }

    // Rien de plus : une étape retirée de l'enum doit disparaître du miroir.
    expect(substr_count((string) $mirror, "value: '"))->toBe(count(PropertyApplicationStatus::cases()));
});

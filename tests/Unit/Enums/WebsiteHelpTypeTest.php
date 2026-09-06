<?php

declare(strict_types=1);

use App\Enums\WebsiteHelpType;

test('every website help type has a French label', function (): void {
    foreach (WebsiteHelpType::cases() as $case) {
        expect($case->label())->not->toBe('')->not->toContain('staff');
    }

    expect(WebsiteHelpType::HousingSearch->label())->toBe('Recherche de logement');
});

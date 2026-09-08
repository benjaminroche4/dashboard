<?php

declare(strict_types=1);

use App\Support\PhoneNumber;

test('PhoneNumber::e164 normalises free-form numbers, French by default', function (): void {
    expect(PhoneNumber::e164('+33 6 12 34 56 78'))->toBe('+33612345678')
        ->and(PhoneNumber::e164('0033 6 12 34 56 78'))->toBe('+33612345678')
        ->and(PhoneNumber::e164('06.12.34.56.78'))->toBe('+33612345678')
        ->and(PhoneNumber::e164('+41 79 123 45 67'))->toBe('+41791234567')
        ->and(PhoneNumber::e164('+33 12'))->toBeNull()
        ->and(PhoneNumber::e164(''))->toBeNull()
        ->and(PhoneNumber::e164(null))->toBeNull();
});

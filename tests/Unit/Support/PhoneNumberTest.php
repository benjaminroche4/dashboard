<?php

declare(strict_types=1);

use App\Support\PhoneNumber;

test('numbers written differently match on their national digits', function (): void {
    expect(PhoneNumber::matches('+33 6 12 34 56 78', '+33612345678'))->toBeTrue()
        ->and(PhoneNumber::matches('06 12 34 56 78', '+33612345678'))->toBeTrue()
        ->and(PhoneNumber::matches('06.12.34.56.78', '0033612345678'))->toBeTrue()
        ->and(PhoneNumber::matches('+33612345678', '+33612345679'))->toBeFalse()
        ->and(PhoneNumber::matches(null, '+33612345678'))->toBeFalse()
        ->and(PhoneNumber::matches('123', '123'))->toBeFalse();
});

test('digits and suffix strip everything but numbers', function (): void {
    expect(PhoneNumber::digits('+41 (0)22 123-45.67'))->toBe('41022123456 7' === '' ? '' : '410221234567')
        ->and(PhoneNumber::suffix('+33612345678'))->toBe('612345678')
        ->and(PhoneNumber::suffix('12345'))->toBe('');
});

<?php

declare(strict_types=1);

use App\Enums\Currency;
use App\Enums\Offer;
use Tests\TestCase;

uses(TestCase::class);

test('there are exactly two offers with French labels', function (): void {
    expect(Offer::values())->toBe(['accompagne', 'confie'])
        ->and(Offer::Accompagne->label())->toBe('Accompagné')
        ->and(Offer::Confie->label())->toBe('Confié');
});

test('default prices come from the company config per currency', function (): void {
    config()->set('company.offers.confie.EUR', 123_456);

    expect(Offer::Confie->defaultPriceCents(Currency::EUR))->toBe(123_456)
        ->and(Offer::Accompagne->defaultPriceCents(Currency::CHF))->toBe(119_000)
        ->and(Offer::Confie->defaultPriceCents(Currency::CHF))->toBe(219_000);
});

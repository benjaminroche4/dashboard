<?php

declare(strict_types=1);

use App\Data\QuoteData;
use App\Enums\Currency;

test('it builds from validated input and computes the totals with the invoice rounding', function (): void {
    $data = QuoteData::from([
        'client_name' => 'Acme SA',
        'client_street' => 'Rue du Rhône 1',
        'client_postal_code' => '1204',
        'client_city' => 'Genève',
        'client_country' => 'Suisse',
        'currency' => 'EUR',
        'vat_rate' => 8.1,
        'discount_percent' => 12.5,
        'issued_at' => '2026-09-07',
        'valid_until' => '2026-10-07',
        'items' => [
            ['offer' => 'accompagne', 'quantity' => 1, 'unit_price_cents' => 119_000],
            ['offer' => null, 'description' => 'État des lieux', 'quantity' => 1.5, 'unit_price_cents' => 10_001],
        ],
        'lead_id' => '4',
    ]);

    expect($data->currency)->toBe(Currency::EUR)
        ->and($data->leadId)->toBe(4)
        ->and($data->clientAddress())->toBe("Rue du Rhône 1\n1204 Genève\nSuisse")
        ->and($data->subtotalCents())->toBe(134_002)
        ->and($data->discountCents())->toBe(16_750)
        ->and($data->netSubtotalCents())->toBe(117_252)
        ->and($data->vatCents())->toBe(9_497)
        ->and($data->totalCents())->toBe(126_749)
        ->and($data->toArray()['amount_cents'])->toBe(126_749)
        ->and($data->toArray()['items'][1]['description'])->toBe('État des lieux')
        ->and($data->toArray()['valid_until']->toDateString())->toBe('2026-10-07');
});

test('an empty address is null', function (): void {
    $data = QuoteData::from([
        'client_name' => 'Acme SA',
        'currency' => 'CHF',
        'vat_rate' => 0,
        'issued_at' => '2026-09-07',
        'valid_until' => '2026-09-07',
        'items' => [['offer' => 'confie', 'quantity' => 1, 'unit_price_cents' => 1]],
    ]);

    expect($data->clientAddress())->toBeNull()
        ->and($data->discountPercent)->toBe(0.0)
        ->and($data->leadId)->toBeNull();
});

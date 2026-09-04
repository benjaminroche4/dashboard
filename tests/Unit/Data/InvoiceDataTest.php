<?php

declare(strict_types=1);

use App\Data\InvoiceData;
use App\Enums\Currency;
use App\Enums\InvoiceStatus;

function invoicePayload(array $overrides = []): array
{
    return [
        'client_name' => 'Acme SA',
        'client_email' => 'compta@acme.ch',
        'client_address' => "Rue du Rhône 1\n1204 Genève",
        'currency' => 'CHF',
        'vat_rate' => 8.1,
        'issued_at' => '2026-09-04',
        'due_at' => '2026-10-04',
        'items' => [
            ['offer' => 'accompagne', 'quantity' => 2, 'unit_price_cents' => 15_000],
            ['offer' => 'confie', 'quantity' => 1.5, 'unit_price_cents' => 9_999],
        ],
        ...$overrides,
    ];
}

test('it computes line totals, VAT and total in cents like the front-end', function (): void {
    $data = InvoiceData::from(invoicePayload());

    // 2 × 150.00 = 300.00 ; 1.5 × 99.99 = 149.985 → 149.99 ; sous-total 449.99
    expect($data->subtotalCents())->toBe(44_999)
        ->and($data->vatCents())->toBe((int) round(44_999 * 8.1 / 100))
        ->and($data->totalCents())->toBe(44_999 + (int) round(44_999 * 8.1 / 100))
        ->and($data->currency)->toBe(Currency::CHF)
        ->and($data->status)->toBe(InvoiceStatus::Draft);
});

test('a zero VAT rate yields no VAT (EU reverse charge)', function (): void {
    $data = InvoiceData::from(invoicePayload(['currency' => 'EUR', 'vat_rate' => 0]));

    expect($data->vatCents())->toBe(0)
        ->and($data->totalCents())->toBe($data->subtotalCents())
        ->and($data->currency)->toBe(Currency::EUR);
});

test('lines carry the offer and its generated description', function (): void {
    $data = InvoiceData::from(invoicePayload());

    expect($data->lines[0]->offer->value)->toBe('accompagne')
        ->and($data->lines[0]->toArray()['description'])->toBe('Offre Accompagné')
        ->and($data->lines[1]->toArray()['description'])->toBe('Offre Confié');
});

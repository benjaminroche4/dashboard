<?php

declare(strict_types=1);

use App\Data\InvoiceData;
use App\Data\InvoiceLineData;
use App\Enums\Currency;
use App\Enums\InvoiceStatus;

function invoicePayload(array $overrides = []): array
{
    return [
        'client_name' => 'Acme SA',
        'client_email' => 'compta@acme.ch',
        'client_street' => 'Rue du Rhône 1',
        'client_postal_code' => '1204',
        'client_city' => 'Genève',
        'client_country' => 'Suisse',
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

test('a free line carries no offer and uses its trimmed label as description', function (): void {
    $data = InvoiceData::from(invoicePayload([
        'items' => [['offer' => null, 'description' => '  État des lieux  ', 'quantity' => 2, 'unit_price_cents' => 15_000]],
    ]));

    $line = $data->lines[0];

    expect($line->offer)->toBeNull()
        ->and($line->isFree())->toBeTrue()
        ->and($line->description())->toBe('État des lieux')
        ->and($line->totalCents())->toBe(30_000)
        ->and($line->toArray())->toBe(['offer' => null, 'description' => 'État des lieux', 'quantity' => 2.0, 'unit_price_cents' => 15_000]);
});

test('a label sent with an offer is ignored in favour of the offer description', function (): void {
    $line = InvoiceLineData::from(['offer' => 'confie', 'description' => 'Autre chose', 'quantity' => 1, 'unit_price_cents' => 100]);

    expect($line->isFree())->toBeFalse()
        ->and($line->label)->toBeNull()
        ->and($line->description())->toBe('Offre Confié');
});

test('it composes the postal address from its parts', function (): void {
    expect(InvoiceData::from(invoicePayload())->clientAddress())->toBe("Rue du Rhône 1\n1204 Genève\nSuisse")
        ->and(InvoiceData::from(invoicePayload(['client_street' => null, 'client_postal_code' => null, 'client_city' => null, 'client_country' => null]))->clientAddress())->toBeNull();
});

test('discount applies before VAT and the deposit reduces the amount due', function (): void {
    $data = InvoiceData::from(invoicePayload([
        'vat_rate' => 10,
        'discount_percent' => 10,
        'deposit_cents' => 20_000,
        'items' => [['offer' => 'accompagne', 'quantity' => 1, 'unit_price_cents' => 100_000]],
    ]));

    expect($data->subtotalCents())->toBe(100_000)
        ->and($data->discountCents())->toBe(10_000)
        ->and($data->netSubtotalCents())->toBe(90_000)
        ->and($data->vatCents())->toBe(9_000)
        ->and($data->totalCents())->toBe(99_000)
        ->and($data->dueCents())->toBe(79_000);
});

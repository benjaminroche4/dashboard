<?php

declare(strict_types=1);

use App\Actions\Invoices\CreateInvoice;
use App\Data\InvoiceData;
use App\Enums\Currency;
use App\Events\DashboardUpdated;
use App\Models\Invoice;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

function createInvoicePayload(array $overrides = []): array
{
    return [
        'client_name' => 'Acme SA',
        'currency' => 'CHF',
        'vat_rate' => 8.1,
        'issued_at' => '2026-09-04',
        'due_at' => '2026-10-04',
        'items' => [['offer' => 'accompagne', 'quantity' => 2, 'unit_price_cents' => 15_000]],
        ...$overrides,
    ];
}

test('it stores the invoice with computed totals, the creator, and broadcasts to the staff', function (): void {
    Event::fake([DashboardUpdated::class]);
    $creator = User::factory()->manager()->create();

    $invoice = (new CreateInvoice)->handle(InvoiceData::from(createInvoicePayload()), $creator);

    expect($invoice->number)->toBe('F-2026-0001')
        ->and($invoice->subtotal_cents)->toBe(30_000)
        ->and($invoice->vat_cents)->toBe(2_430)
        ->and($invoice->amount_cents)->toBe(32_430)
        ->and($invoice->currency)->toBe(Currency::CHF)
        ->and($invoice->created_by)->toBe($creator->id)
        ->and($invoice->items)->toHaveCount(1);

    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->resource === 'invoices'
        && $event->message === 'a créé la facture F-2026-0001');
});

test('numbers are sequential per issue year', function (): void {
    Event::fake([DashboardUpdated::class]);
    Invoice::factory()->create(['number' => 'F-2026-0041', 'issued_at' => '2026-01-10']);
    Invoice::factory()->create(['number' => 'F-2025-0999', 'issued_at' => '2025-12-10']);

    $next = (new CreateInvoice)->handle(InvoiceData::from(createInvoicePayload()));
    $lastYear = (new CreateInvoice)->handle(InvoiceData::from(createInvoicePayload(['issued_at' => '2025-12-20', 'due_at' => '2026-01-20'])));

    expect($next->number)->toBe('F-2026-0042')
        ->and($lastYear->number)->toBe('F-2025-1000');
});

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

    expect($invoice->number)->toBe('RP-27001')
        ->and($invoice->subtotal_cents)->toBe(30_000)
        ->and($invoice->vat_cents)->toBe(2_430)
        ->and($invoice->amount_cents)->toBe(32_430)
        ->and($invoice->currency)->toBe(Currency::CHF)
        ->and($invoice->created_by)->toBe($creator->id)
        ->and($invoice->items)->toHaveCount(1);

    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->resource === 'invoices'
        && $event->message === 'a créé la facture RP-27001');
});

test('numbers follow the RP-27 prefix and a growing sequence', function (): void {
    Event::fake([DashboardUpdated::class]);
    Invoice::factory()->create(['number' => 'RP-27053']);
    Invoice::factory()->create(['number' => 'RP-27009']);

    $next = (new CreateInvoice)->handle(InvoiceData::from(createInvoicePayload()));
    $after = (new CreateInvoice)->handle(InvoiceData::from(createInvoicePayload()));

    expect($next->number)->toBe('RP-27054')
        ->and($after->number)->toBe('RP-27055')
        ->and(CreateInvoice::nextNumber())->toBe('RP-27056');
});

test('the sequence keeps growing past three digits', function (): void {
    Event::fake([DashboardUpdated::class]);
    Invoice::factory()->create(['number' => 'RP-27999']);

    expect((new CreateInvoice)->handle(InvoiceData::from(createInvoicePayload()))->number)->toBe('RP-271000');
});

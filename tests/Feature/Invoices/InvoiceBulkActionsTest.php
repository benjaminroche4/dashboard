<?php

declare(strict_types=1);

use App\Enums\InvoiceStatus;
use App\Events\DashboardUpdated;
use App\Mail\InvoiceSent;
use App\Models\Invoice;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Mail;

beforeEach(function (): void {
    Mail::fake();
    Event::fake([DashboardUpdated::class]);
    config()->set('services.docraptor.key');
});

test('a manager sends every sendable invoice at once and the others are reported as skipped', function (): void {
    $draft = Invoice::factory()->create(['status' => InvoiceStatus::Draft, 'client_email' => 'a@exemple.com', 'number' => 'RP-27101']);
    $noEmail = Invoice::factory()->create(['status' => InvoiceStatus::Draft, 'client_email' => null, 'number' => 'RP-27102']);
    $paid = Invoice::factory()->create(['status' => InvoiceStatus::Paid, 'client_email' => 'b@exemple.com', 'number' => 'RP-27103']);

    $this->actingAs(User::factory()->manager()->create())
        ->from(route('invoices.index'))
        ->post(route('invoices.bulk-send'), ['ids' => [$draft->id, $noEmail->id, $paid->id]])
        ->assertRedirect(route('invoices.index'));

    expect($draft->fresh()->status)->toBe(InvoiceStatus::Sent)
        ->and($noEmail->fresh()->status)->toBe(InvoiceStatus::Draft)
        ->and($paid->fresh()->status)->toBe(InvoiceStatus::Paid);
    Mail::assertQueued(InvoiceSent::class, 1);
});

test('a manager marks several invoices paid at the same date, skipping the non-payable ones', function (): void {
    $sent = Invoice::factory()->create(['status' => InvoiceStatus::Sent]);
    $overdue = Invoice::factory()->create(['status' => InvoiceStatus::Overdue]);
    $cancelled = Invoice::factory()->create(['status' => InvoiceStatus::Cancelled]);

    $this->actingAs(User::factory()->manager()->create())
        ->from(route('invoices.index'))
        ->post(route('invoices.bulk-pay'), ['ids' => [$sent->id, $overdue->id, $cancelled->id], 'paid_at' => '2026-09-01'])
        ->assertRedirect(route('invoices.index'));

    expect($sent->fresh()->status)->toBe(InvoiceStatus::Paid)
        ->and($sent->fresh()->paid_at?->toDateString())->toBe('2026-09-01')
        ->and($overdue->fresh()->status)->toBe(InvoiceStatus::Paid)
        ->and($cancelled->fresh()->status)->toBe(InvoiceStatus::Cancelled);
});

test('members cannot run bulk actions', function (): void {
    $invoice = Invoice::factory()->create(['status' => InvoiceStatus::Sent]);

    $this->actingAs(User::factory()->create())
        ->post(route('invoices.bulk-pay'), ['ids' => [$invoice->id], 'paid_at' => '2026-09-01'])
        ->assertForbidden();

    expect($invoice->fresh()->status)->toBe(InvoiceStatus::Sent);
});

test('bulk requests validate the ids and the payment date', function (): void {
    $this->actingAs(User::factory()->admin()->create())
        ->from(route('invoices.index'))
        ->post(route('invoices.bulk-pay'), ['ids' => [999_999], 'paid_at' => '2999-01-01'])
        ->assertSessionHasErrors(['ids.0', 'paid_at']);

    $this->actingAs(User::factory()->admin()->create())
        ->from(route('invoices.index'))
        ->post(route('invoices.bulk-send'), ['ids' => []])
        ->assertSessionHasErrors(['ids']);
});

<?php

declare(strict_types=1);

use App\Actions\Invoices\MarkInvoicePaid;
use App\Actions\Invoices\MarkInvoicesPaid;
use App\Actions\Invoices\SendInvoice;
use App\Actions\Invoices\SendInvoices;
use App\Enums\InvoiceStatus;
use App\Events\DashboardUpdated;
use App\Models\Invoice;
use App\Services\DocRaptor;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

test('SendInvoices sends the sendable invoices and lists the skipped numbers', function (): void {
    Mail::fake();
    Event::fake([DashboardUpdated::class]);
    $sendable = Invoice::factory()->create(['status' => InvoiceStatus::Draft, 'client_email' => 'a@exemple.com', 'number' => 'RP-27201']);
    $skipped = Invoice::factory()->create(['status' => InvoiceStatus::Paid, 'number' => 'RP-27202']);

    $result = (new SendInvoices(new SendInvoice(new DocRaptor(null, true, 'x'))))
        ->handle(Invoice::query()->whereIn('id', [$sendable->id, $skipped->id])->get());

    expect($result)->toBe(['sent' => ['RP-27201'], 'skipped' => ['RP-27202']])
        ->and($sendable->fresh()->status)->toBe(InvoiceStatus::Sent);
});

test('MarkInvoicesPaid pays the payable invoices and lists the skipped numbers', function (): void {
    Event::fake([DashboardUpdated::class]);
    $payable = Invoice::factory()->create(['status' => InvoiceStatus::Overdue, 'number' => 'RP-27301']);
    $skipped = Invoice::factory()->create(['status' => InvoiceStatus::Draft, 'number' => 'RP-27302']);

    $result = (new MarkInvoicesPaid(new MarkInvoicePaid))
        ->handle(Invoice::query()->whereIn('id', [$payable->id, $skipped->id])->get(), CarbonImmutable::parse('2026-09-01'));

    expect($result)->toBe(['paid' => ['RP-27301'], 'skipped' => ['RP-27302']])
        ->and($payable->fresh()->status)->toBe(InvoiceStatus::Paid)
        ->and($skipped->fresh()->status)->toBe(InvoiceStatus::Draft);
    Event::assertDispatchedTimes(DashboardUpdated::class, 1);
});

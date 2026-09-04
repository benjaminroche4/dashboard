<?php

declare(strict_types=1);

use App\Enums\InvoiceStatus;
use App\Models\Invoice;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

test('the default invoice is sent with a 30-day term', function (): void {
    $invoice = Invoice::factory()->create();

    expect($invoice->status)->toBe(InvoiceStatus::Sent)
        ->and($invoice->issued_at->diffInDays($invoice->due_at))->toBe(30.0)
        ->and($invoice->paid_at)->toBeNull();
});

test('paid and overdue states set consistent dates', function (): void {
    $paid = Invoice::factory()->paid()->create();
    $overdue = Invoice::factory()->overdue()->create();

    expect($paid->paid_at)->not->toBeNull()
        ->and($overdue->status)->toBe(InvoiceStatus::Overdue)
        ->and($overdue->due_at->isPast())->toBeTrue();
});

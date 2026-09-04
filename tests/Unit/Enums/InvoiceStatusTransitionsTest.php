<?php

declare(strict_types=1);

use App\Enums\InvoiceStatus;

test('draft can be sent or cancelled, sent can be paid, overdue or cancelled', function (): void {
    expect(InvoiceStatus::Draft->canTransitionTo(InvoiceStatus::Sent))->toBeTrue()
        ->and(InvoiceStatus::Draft->canTransitionTo(InvoiceStatus::Paid))->toBeFalse()
        ->and(InvoiceStatus::Sent->canTransitionTo(InvoiceStatus::Paid))->toBeTrue()
        ->and(InvoiceStatus::Sent->canTransitionTo(InvoiceStatus::Overdue))->toBeTrue()
        ->and(InvoiceStatus::Overdue->canTransitionTo(InvoiceStatus::Paid))->toBeTrue()
        ->and(InvoiceStatus::Paid->transitions())->toBe([])
        ->and(InvoiceStatus::Cancelled->transitions())->toBe([]);
});

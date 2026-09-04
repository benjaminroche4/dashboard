<?php

declare(strict_types=1);

use App\Enums\InvoiceStatus;

test('every invoice status has a French label', function (): void {
    foreach (InvoiceStatus::cases() as $status) {
        expect($status->label())->not->toBeEmpty();
    }

    expect(InvoiceStatus::Overdue->label())->toBe('En retard');
});

test('values lists the string values', function (): void {
    expect(InvoiceStatus::values())->toBe(['draft', 'sent', 'paid', 'overdue', 'cancelled']);
});

<?php

declare(strict_types=1);

use App\Enums\QuoteStatus;

test('the lifecycle allows sending, accepting, declining, expiring and invoicing in the right order', function (): void {
    expect(QuoteStatus::Draft->canTransitionTo(QuoteStatus::Sent))->toBeTrue()
        ->and(QuoteStatus::Draft->canTransitionTo(QuoteStatus::Invoiced))->toBeTrue()
        ->and(QuoteStatus::Expired->canTransitionTo(QuoteStatus::Invoiced))->toBeTrue()
        ->and(QuoteStatus::Sent->canTransitionTo(QuoteStatus::Accepted))->toBeTrue()
        ->and(QuoteStatus::Sent->canTransitionTo(QuoteStatus::Invoiced))->toBeTrue()
        ->and(QuoteStatus::Sent->canTransitionTo(QuoteStatus::Expired))->toBeTrue()
        ->and(QuoteStatus::Accepted->canTransitionTo(QuoteStatus::Invoiced))->toBeTrue()
        ->and(QuoteStatus::Expired->canTransitionTo(QuoteStatus::Sent))->toBeTrue()
        ->and(QuoteStatus::Declined->transitions())->toBe([])
        ->and(QuoteStatus::Invoiced->transitions())->toBe([]);
});

test('labels are in French', function (): void {
    expect(array_map(fn (QuoteStatus $status): string => $status->label(), QuoteStatus::cases()))
        ->toBe(['Brouillon', 'Envoyé', 'Accepté', 'Refusé', 'Expiré', 'Facturé'])
        ->and(QuoteStatus::values())->toHaveCount(6);
});

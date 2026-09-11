<?php

declare(strict_types=1);

use App\Enums\LeadLossReason;

test('loss reasons have French labels and options for the form', function (): void {
    expect(LeadLossReason::SmallBudget->label())->toBe('Trop petit budget')
        ->and(LeadLossReason::options())->toHaveCount(5)
        ->and(LeadLossReason::options()[0])->toBe(['value' => 'not_qualified', 'label' => 'Pas du tout qualifié'])
        ->and(LeadLossReason::options()[3])->toBe(['value' => 'tight_timing', 'label' => 'Timing trop serré']);
});

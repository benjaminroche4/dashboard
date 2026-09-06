<?php

declare(strict_types=1);

use App\Enums\LeadLossReason;

test('loss reasons have French labels and options for the form', function (): void {
    expect(LeadLossReason::TooExpensive->label())->toBe('Trop cher')
        ->and(LeadLossReason::options())->toHaveCount(5)
        ->and(LeadLossReason::options()[2])->toBe(['value' => 'no_answer', 'label' => 'Sans réponse']);
});

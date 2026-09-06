<?php

declare(strict_types=1);

use App\Enums\LeadSource;
use App\Enums\PhoneCallResult;
use App\Enums\PhoneEventKind;

test('supported Allo topics are listed and call results are labelled in French', function (): void {
    expect(PhoneEventKind::values())->toBe(['call.completed', 'sms.received'])
        ->and(PhoneCallResult::Voicemail->label())->toBe('message vocal')
        ->and(PhoneCallResult::Blocked->isContact())->toBeFalse()
        ->and(PhoneCallResult::Failed->isContact())->toBeFalse()
        ->and(PhoneCallResult::Answered->isContact())->toBeTrue()
        ->and(LeadSource::Phone->label())->toBe('Téléphone');

    foreach (PhoneCallResult::cases() as $case) {
        expect($case->label())->not->toBe('')->not->toContain('staff');
    }
});

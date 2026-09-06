<?php

declare(strict_types=1);

use App\Data\PhoneEventData;
use App\Enums\PhoneCallResult;
use App\Enums\PhoneEventKind;

test('it reads a completed call: the contact is the caller when inbound, the callee when outbound', function (): void {
    $inbound = PhoneEventData::from('call.completed', ['id' => 'cll_1', 'from_number' => '+33612345678', 'from_name' => ' Marie Dupont ', 'to' => '+33184804344', 'to_name' => 'RIP', 'type' => 'INBOUND', 'result' => 'ANSWERED', 'length_in_minutes' => 5.5, 'summary' => 'Cherche un T2.', 'user_email' => 'c@rip.fr', 'start_date' => '2026-09-06T14:30:00.000Z']);

    expect($inbound->kind)->toBe(PhoneEventKind::CallCompleted)
        ->and($inbound->inbound)->toBeTrue()
        ->and($inbound->contactNumber())->toBe('+33612345678')
        ->and($inbound->contactName)->toBe('Marie Dupont')
        ->and($inbound->result)->toBe(PhoneCallResult::Answered)
        ->and($inbound->lengthInMinutes)->toBe(5.5)
        ->and($inbound->isContact())->toBeTrue()
        ->and($inbound->at?->toIso8601String())->toBe('2026-09-06T14:30:00+00:00')
        ->and($inbound->toArray()['external_id'])->toBe('cll_1');

    $outbound = PhoneEventData::from('call.completed', ['id' => 'cll_2', 'from_number' => '+33184804344', 'from_name' => 'RIP', 'to' => '+33612345678', 'to_name' => 'Marie Dupont', 'type' => 'OUTBOUND', 'result' => 'VOICEMAIL']);

    expect($outbound->inbound)->toBeFalse()
        ->and($outbound->contactNumber())->toBe('+33612345678')
        ->and($outbound->contactName)->toBe('Marie Dupont')
        ->and($outbound->summary)->toBeNull();
});

test('blocked and failed calls, and events without a number, are not contacts', function (): void {
    expect(PhoneEventData::from('call.completed', ['from_number' => '+33612345678', 'to' => '+331', 'result' => 'BLOCKED'])->isContact())->toBeFalse()
        ->and(PhoneEventData::from('call.completed', ['from_number' => '+33612345678', 'to' => '+331', 'result' => 'FAILED'])->isContact())->toBeFalse()
        ->and(PhoneEventData::from('call.completed', ['from_number' => '', 'to' => '+331', 'result' => 'ANSWERED'])->isContact())->toBeFalse()
        ->and(PhoneEventData::from('call.completed', ['from_number' => '+33612345678', 'to' => '+331', 'result' => 'TRANSFERRED_AI'])->isContact())->toBeTrue();
});

test('it reads a received SMS with its text and date', function (): void {
    $sms = PhoneEventData::from('sms.received', ['id' => 'msg_1', 'direction' => 'INBOUND', 'content' => 'Bonjour', 'sent_at' => '2026-09-06T16:00:00.000Z', 'from_number' => '+33612345678', 'to_number' => '+33184804344', 'from_name' => 'Marie']);

    expect($sms->kind)->toBe(PhoneEventKind::SmsReceived)
        ->and($sms->content)->toBe('Bonjour')
        ->and($sms->result)->toBeNull()
        ->and($sms->contactNumber())->toBe('+33612345678')
        ->and($sms->at?->toIso8601String())->toBe('2026-09-06T16:00:00+00:00');
});

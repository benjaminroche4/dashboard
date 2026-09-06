<?php

declare(strict_types=1);

use App\Actions\Leads\CreateLead;
use App\Actions\Phone\RecordPhoneEvent;
use App\Data\PhoneEventData;
use App\Events\DashboardUpdated;
use App\Models\Lead;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

beforeEach(function (): void {
    Event::fake([DashboardUpdated::class]);
});

function phoneCall(string $from = '+33612345678', string $result = 'ANSWERED'): PhoneEventData
{
    return PhoneEventData::from('call.completed', ['id' => 'cll_1', 'from_number' => $from, 'from_name' => 'Marie Dupont', 'to' => '+33184804344', 'type' => 'INBOUND', 'result' => $result, 'length_in_minutes' => 2, 'summary' => 'Rappel demandé.']);
}

test('it picks the most recently updated lead when several share the number', function (): void {
    $old = Lead::factory()->create(['phone' => '+33 6 12 34 56 78', 'updated_at' => now()->subDays(3)]);
    $recent = Lead::factory()->create(['phone' => '06 12 34 56 78', 'updated_at' => now()]);

    $outcome = (new RecordPhoneEvent(new CreateLead))->handle(phoneCall(), 'msg_1');

    expect($outcome)->toBe(RecordPhoneEvent::OUTCOME_NOTED)
        ->and($recent->notes()->count())->toBe(1)
        ->and($old->notes()->count())->toBe(0);
});

test('it ignores blocked calls and never records the same delivery twice', function (): void {
    $action = new RecordPhoneEvent(new CreateLead);

    expect($action->handle(phoneCall(result: 'BLOCKED'), 'msg_1'))->toBe(RecordPhoneEvent::OUTCOME_IGNORED)
        ->and($action->handle(phoneCall(), 'msg_1'))->toBe(RecordPhoneEvent::OUTCOME_DUPLICATE)
        ->and($action->handle(phoneCall(), 'msg_2'))->toBe(RecordPhoneEvent::OUTCOME_CREATED)
        ->and(Lead::query()->count())->toBe(1);
});

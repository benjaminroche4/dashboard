<?php

declare(strict_types=1);

use App\Actions\Leads\CreateLead;
use App\Actions\Leads\UpdateLeadStatus;
use App\Data\LeadData;
use App\Enums\LeadSource;
use App\Enums\LeadStatus;
use App\Enums\Offer;
use App\Events\DashboardUpdated;
use App\Models\Lead;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

beforeEach(function (): void {
    Event::fake([DashboardUpdated::class]);
});

test('LeadData reads the validated payload with sensible defaults', function (): void {
    $data = LeadData::from(['first_name' => 'Ana', 'last_name' => 'Silva', 'phone' => '+41 79 000 00 00']);

    expect($data->offer)->toBeNull()
        ->and($data->source)->toBe(LeadSource::Website)
        ->and($data->currency->value)->toBe('EUR')
        ->and($data->toArray()['phone'])->toBe('+41 79 000 00 00');
});

test('CreateLead stores a new lead and UpdateLeadStatus moves it on', function (): void {
    $lead = (new CreateLead)->handle(LeadData::from([
        'first_name' => 'Ana', 'last_name' => 'Silva', 'email' => 'ana@example.com', 'offer' => Offer::Accompagne->value,
    ]));

    expect($lead->status)->toBe(LeadStatus::New)->and($lead->offer)->toBe(Offer::Accompagne);

    (new UpdateLeadStatus)->handle($lead, LeadStatus::InDiscussion);
    (new UpdateLeadStatus)->handle($lead, LeadStatus::InDiscussion);

    expect($lead->fresh()?->status)->toBe(LeadStatus::InDiscussion)
        ->and(LeadStatus::InDiscussion->isClosed())->toBeFalse()
        ->and(LeadStatus::Lost->isClosed())->toBeTrue();
    Event::assertDispatchedTimes(DashboardUpdated::class, 2);
});

test('the lead factory and its states are consistent', function (): void {
    expect(Lead::factory()->converted()->create()->status)->toBe(LeadStatus::Converted)
        ->and(Lead::factory()->create()->last_contacted_at)->toBeNull();
});

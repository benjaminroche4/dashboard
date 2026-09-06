<?php

declare(strict_types=1);

use App\Actions\Leads\AddLeadNote;
use App\Actions\Leads\CreateLead;
use App\Actions\Leads\TouchLeadContact;
use App\Actions\Leads\UpdateLeadStatus;
use App\Data\LeadData;
use App\Enums\LeadSource;
use App\Enums\LeadStatus;
use App\Enums\Offer;
use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\User;
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

    expect($lead->status)->toBe(LeadStatus::Todo)->and($lead->offer)->toBe(Offer::Accompagne);

    (new UpdateLeadStatus)->handle($lead, LeadStatus::QuoteSent);
    (new UpdateLeadStatus)->handle($lead, LeadStatus::QuoteSent);

    expect($lead->fresh()?->status)->toBe(LeadStatus::QuoteSent)
        ->and(LeadStatus::QuoteSent->isClosed())->toBeFalse()
        ->and(LeadStatus::Archived->isClosed())->toBeTrue();
    Event::assertDispatchedTimes(DashboardUpdated::class, 2);
});

test('the lead factory and its states are consistent', function (): void {
    expect(Lead::factory()->converted()->create()->status)->toBe(LeadStatus::Converted)
        ->and(Lead::factory()->create()->last_contacted_at)->toBeNull();
});

test('TouchLeadContact stamps the last contact and tells the staff', function (): void {
    $lead = Lead::factory()->create(['last_contacted_at' => null]);

    (new TouchLeadContact)->handle($lead);

    expect($lead->fresh()?->last_contacted_at)->not->toBeNull();
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->resource === 'leads');
});

test('AddLeadNote detects @mentions of other staff members and tells them', function (): void {
    $author = User::factory()->create(['name' => 'Admin']);
    $camille = User::factory()->create(['name' => 'Camille Roy']);
    User::factory()->create(['name' => 'Nina']);
    $lead = Lead::factory()->create();

    (new AddLeadNote)->handle($lead, 'Vu avec @Camille Roy et @Admin, on rappelle demain.', $author);

    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->payload['mentions'] === [$camille->id]
        && str_contains($event->message, 'mentionné'));
});

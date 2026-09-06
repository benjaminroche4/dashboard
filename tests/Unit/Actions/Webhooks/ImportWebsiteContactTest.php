<?php

declare(strict_types=1);

use App\Actions\Leads\CreateLead;
use App\Actions\Webhooks\ImportWebsiteContact;
use App\Data\WebsiteContactData;
use App\Enums\LeadSource;
use App\Events\DashboardUpdated;
use App\Models\Lead;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

beforeEach(function (): void {
    Event::fake([DashboardUpdated::class]);
});

function websiteContact(string $reference = 'CT-000042'): WebsiteContactData
{
    return WebsiteContactData::from([
        'reference' => $reference,
        'first_name' => 'Léa',
        'last_name' => 'Durand',
        'email' => 'lea@example.com',
        'help_type' => 'other',
        'lang' => 'fr',
    ]);
}

test('it creates a website lead with the contact reference and help type in the source note', function (): void {
    $lead = (new ImportWebsiteContact(new CreateLead))->handle(websiteContact());

    expect($lead->wasRecentlyCreated)->toBeTrue()
        ->and($lead->external_reference)->toBe('CT-000042')
        ->and($lead->source)->toBe(LeadSource::Website)
        ->and($lead->source_note)->toBe('Formulaire de contact · Autre demande ou information · CT-000042')
        ->and($lead->reference)->toStartWith('LD-');
});

test('it returns the existing lead when the reference was already imported', function (): void {
    $existing = Lead::factory()->create(['external_reference' => 'CT-000042']);

    $lead = (new ImportWebsiteContact(new CreateLead))->handle(websiteContact());

    expect($lead->is($existing))->toBeTrue()
        ->and($lead->wasRecentlyCreated)->toBeFalse()
        ->and(Lead::query()->count())->toBe(1);
    Event::assertNotDispatched(DashboardUpdated::class);
});

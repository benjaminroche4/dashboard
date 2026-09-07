<?php

declare(strict_types=1);

use App\Actions\Leads\CreateLead;
use App\Actions\Webhooks\ImportWebsiteContact;
use App\Data\WebsiteContactData;
use App\Enums\WebsiteHelpType;
use App\Events\DashboardUpdated;
use Illuminate\Support\Facades\Event;

test('a website contact keeps its help type so rental-management requests become owner leads', function (): void {
    Event::fake([DashboardUpdated::class]);

    $lead = resolve(ImportWebsiteContact::class)->handle(WebsiteContactData::from([
        'reference' => 'CT-000123',
        'first_name' => 'Paul',
        'last_name' => 'Roux',
        'email' => 'paul@example.com',
        'help_type' => 'rental_management',
        'created_at' => now()->toIso8601String(),
    ]));

    expect($lead->help_type)->toBe(WebsiteHelpType::RentalManagement)
        ->and(resolve(CreateLead::class))->toBeInstanceOf(CreateLead::class);
});

<?php

declare(strict_types=1);

use App\Actions\Leads\CreateLead;
use App\Actions\Leads\GenerateLeadReference;
use App\Data\LeadData;
use App\Events\DashboardUpdated;
use App\Models\Lead;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

test('a reference looks like LD-XXXX and never repeats', function (): void {
    Event::fake([DashboardUpdated::class]);
    $generate = new GenerateLeadReference;

    $references = collect(range(1, 50))->map(function () use ($generate): string {
        $reference = $generate->handle();
        Lead::factory()->create(['reference' => $reference]);

        return $reference;
    });

    expect($references->every(fn (string $reference): bool => (bool) preg_match('/^LD-\d{4}$/', $reference)))->toBeTrue()
        ->and($references->unique())->toHaveCount(50);
});

test('CreateLead stamps a reference on the new lead', function (): void {
    Event::fake([DashboardUpdated::class]);

    $lead = (new CreateLead)->handle(LeadData::from(['first_name' => 'Ana', 'last_name' => 'Silva', 'email' => 'ana@example.com']));

    expect($lead->reference)->toMatch('/^LD-\d{4}$/');
});

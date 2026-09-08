<?php

declare(strict_types=1);

use App\Actions\Visits\SendVisitReportReminders;
use App\Enums\VisitStatus;
use App\Events\DashboardUpdated;
use App\Mail\VisitReportDue;
use App\Models\Lead;
use App\Models\Property;
use App\Models\User;
use App\Models\Visit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

test('the assignee of a past visit without report is e-mailed once, with a targeted toast', function (): void {
    Mail::fake();
    Event::fake([DashboardUpdated::class]);
    $camille = User::factory()->create(['name' => 'Camille', 'email' => 'camille@example.com']);

    $due = Visit::factory()->create(['assigned_to' => $camille->id, 'scheduled_at' => now()->subHours(2)]);
    Visit::factory()->create(['assigned_to' => $camille->id, 'scheduled_at' => now()->subMinutes(10)]); // encore en cours
    Visit::factory()->create(['assigned_to' => $camille->id, 'scheduled_at' => now()->subDay(), 'status' => VisitStatus::Cancelled]);
    Visit::factory()->reported()->create(['assigned_to' => $camille->id]);
    Visit::factory()->create(['assigned_to' => $camille->id, 'scheduled_at' => now()->subDay(), 'report_reminded_at' => now()->subHours(20)]);
    Visit::factory()->create(['assigned_to' => null, 'scheduled_at' => now()->subDay()]);
    Visit::factory()->create(['assigned_to' => $camille->id, 'scheduled_at' => now()->addDay()]);

    expect((new SendVisitReportReminders)->handle())->toBe(1);

    Mail::assertSent(VisitReportDue::class, fn (VisitReportDue $mail): bool => $mail->hasTo('camille@example.com') && $mail->visit->is($due));
    Mail::assertSentCount(1);
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->payload['mentions'] === [$camille->id]
        && str_contains((string) $event->message, 'vous rappelle le compte rendu'));
    expect($due->refresh()->report_reminded_at)->not->toBeNull();

    // Un second passage ne relance pas la même visite.
    expect((new SendVisitReportReminders)->handle())->toBe(0);
});

test('the reminder e-mail names the client, the property, the date and links to the report', function (): void {
    $camille = User::factory()->create(['name' => 'Camille']);
    $lead = Lead::factory()->converted()->create(['first_name' => 'Léa', 'last_name' => 'Durand', 'reference' => 'LD-1234']);
    $property = Property::factory()->create(['title' => 'T2 lumineux · 11e', 'street' => '12 rue Oberkampf', 'postal_code' => '75011', 'city' => 'Paris']);
    $visit = Visit::factory()->create(['lead_id' => $lead->id, 'property_id' => $property->id, 'assigned_to' => $camille->id, 'scheduled_at' => now()->subHours(3)]);

    $html = (new VisitReportDue($visit->load(['lead', 'property', 'assignee'])))->render();

    expect($html)->toContain('Bonjour Camille')
        ->toContain('Léa Durand')
        ->toContain('LD-1234')
        ->toContain('T2 lumineux · 11e')
        ->toContain('12 rue Oberkampf, 75011 Paris')
        ->toContain('Rédiger le compte rendu')
        ->toContain(route('clients.visits', ['report' => $visit->uuid]));
});

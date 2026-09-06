<?php

declare(strict_types=1);

use App\Actions\Leads\SendRecontactReminders;
use App\Enums\LeadStatus;
use App\Events\DashboardUpdated;
use App\Mail\RecontactsDue;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

test('each assignee receives one e-mail with their due and overdue recontacts, plus a targeted toast', function (): void {
    Mail::fake();
    Event::fake([DashboardUpdated::class]);
    $camille = User::factory()->create(['name' => 'Camille', 'email' => 'camille@example.com']);
    $nina = User::factory()->create(['name' => 'Nina']);

    $today = Lead::factory()->create(['assigned_to' => $camille->id, 'recontact_at' => today(), 'status' => LeadStatus::InProgress]);
    $late = Lead::factory()->create(['assigned_to' => $camille->id, 'recontact_at' => today()->subDays(3), 'status' => LeadStatus::QuoteSent]);
    Lead::factory()->create(['assigned_to' => $camille->id, 'recontact_at' => today()->addDay()]);
    Lead::factory()->create(['assigned_to' => $camille->id, 'recontact_at' => today(), 'status' => LeadStatus::Archived]);
    Lead::factory()->create(['assigned_to' => $nina->id, 'recontact_at' => null]);
    Lead::factory()->create(['assigned_to' => null, 'recontact_at' => today()]);

    $count = (new SendRecontactReminders)->handle();

    expect($count)->toBe(1);
    Mail::assertSent(RecontactsDue::class, fn (RecontactsDue $mail): bool => $mail->hasTo('camille@example.com')
        && $mail->leads->pluck('id')->sort()->values()->all() === collect([$today->id, $late->id])->sort()->values()->all());
    Mail::assertSentCount(1);
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->payload['mentions'] === [$camille->id]
        && str_contains($event->message, '2 recontact(s), dont 1 en retard'));
});

test('the reminder e-mail lists the leads with their reference and channel', function (): void {
    $camille = User::factory()->create(['name' => 'Camille']);
    $lead = Lead::factory()->create(['first_name' => 'Léa', 'last_name' => 'Durand', 'reference' => 'LD-1234', 'assigned_to' => $camille->id, 'recontact_at' => today(), 'recontact_channel' => 'whatsapp']);

    $html = (new RecontactsDue($camille, collect([$lead])))->render();

    expect($html)->toContain('Léa Durand')->toContain('LD-1234')->toContain('WhatsApp')->toContain(route('leads.show', $lead));
});

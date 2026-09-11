<?php

declare(strict_types=1);

use App\Actions\Leads\SendVisioReportReminders;
use App\Events\DashboardUpdated;
use App\Mail\VisioReportDue;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Mail;
use Inertia\Testing\AssertableInertia;

beforeEach(fn () => Event::fake([DashboardUpdated::class]));

test('the assignee writes the post-visio report: note on the lead, contact dated, report no longer due', function (): void {
    $member = User::factory()->create(['name' => 'Camille']);
    $lead = Lead::factory()->create(['first_name' => 'Léa', 'last_name' => 'Durand', 'assigned_to' => $member->id, 'visio_at' => now()->subHours(2), 'last_contacted_at' => now()->subDays(3)]);

    $this->actingAs($member)
        ->get(route('leads.show', $lead))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page->where('lead.visio_report_due', true)->where('lead.visio_report', null));

    $this->actingAs($member)
        ->from(route('leads.show', $lead))
        ->post(route('leads.visio.report', $lead), ['report' => 'Appel très positif, budget confirmé, souhaite visiter dès la semaine prochaine.'])
        ->assertRedirect(route('leads.show', $lead))
        ->assertSessionHasNoErrors();

    $lead->refresh();
    expect($lead->visio_report)->toContain('Appel très positif')
        ->and($lead->visio_report_submitted_by)->toBe($member->id)
        ->and($lead->visioReportDue())->toBeFalse()
        ->and($lead->last_contacted_at?->isToday())->toBeTrue()
        ->and($lead->notes()->latest('id')->first()?->body)->toContain("Compte rendu de l'appel vidéo du")->toContain('Appel très positif');
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => str_contains((string) $event->message, "compte rendu de l'appel vidéo"));

    $this->actingAs($member)->post(route('leads.visio.report', $lead), ['report' => 'Court'])->assertSessionHasErrors('report');
    $this->actingAs($member)->post("/locataires/{$lead->id}/visio/report", ['report' => 'Un compte rendu assez long.'])->assertNotFound();
});

test('the assignee is reminded once by e-mail after the visio, and again after a new slot', function (): void {
    Mail::fake();
    $camille = User::factory()->create(['name' => 'Camille', 'email' => 'camille@example.com']);

    $due = Lead::factory()->create(['first_name' => 'Léa', 'last_name' => 'Durand', 'reference' => 'LD-1234', 'assigned_to' => $camille->id, 'visio_at' => now()->subHours(2)]);
    Lead::factory()->create(['assigned_to' => $camille->id, 'visio_at' => now()->subMinutes(10)]); // encore en cours
    Lead::factory()->create(['assigned_to' => $camille->id, 'visio_at' => now()->addDay()]);
    Lead::factory()->create(['assigned_to' => null, 'visio_at' => now()->subDay()]);
    Lead::factory()->create(['assigned_to' => $camille->id, 'visio_at' => now()->subDay(), 'visio_report' => 'Fait.', 'visio_report_submitted_at' => now()->subHours(20)]);

    expect((new SendVisioReportReminders)->handle())->toBe(1);
    Mail::assertQueued(VisioReportDue::class, fn (VisioReportDue $mail): bool => $mail->hasTo('camille@example.com') && $mail->lead->is($due));
    Mail::assertQueuedCount(1);
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->payload['mentions'] === [$camille->id]
        && str_contains((string) $event->message, "compte rendu de l'appel vidéo"));
    expect((new SendVisioReportReminders)->handle())->toBe(0);

    $html = (new VisioReportDue($due->fresh()->load('assignee')))->render();
    expect($html)->toContain('Bonjour Camille')->toContain('Léa Durand')->toContain('LD-1234')->toContain(route('leads.show', ['lead' => $due, 'report' => 'visio']));

    // Compte rendu rédigé, puis nouvelle visio : le rappel repart pour le nouveau créneau.
    $due->forceFill(['visio_report' => 'Fait.', 'visio_report_submitted_at' => now()])->save();
    $due->forceFill(['visio_at' => now()->subHour(), 'visio_report_reminded_at' => null])->save();
    expect($due->fresh()->visioReportDue())->toBeFalse();
    $due->forceFill(['visio_report_submitted_at' => now()->subDays(2)])->save();
    expect($due->fresh()->visioReportDue())->toBeTrue();

    $this->artisan('visits:remind-reports')->assertSuccessful();
});

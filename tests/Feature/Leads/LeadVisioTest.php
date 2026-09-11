<?php

declare(strict_types=1);

use App\Events\DashboardUpdated;
use App\Mail\LeadVisioScheduled;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Inertia\Testing\AssertableInertia;

beforeEach(function (): void {
    Event::fake([DashboardUpdated::class]);
    Mail::fake();
    Http::fake();
    config()->set('services.google.calendar_key_file');
});

test('staff schedule a video call from the lead page', function (): void {
    $user = User::factory()->create();
    $lead = Lead::factory()->create(['email' => 'lea@example.com']);

    $this->actingAs($user)
        ->from(route('leads.show', $lead))
        ->post(route('leads.visio', $lead), ['visio_at' => now()->addDays(3)->format('Y-m-d\T10:00')])
        ->assertRedirect(route('leads.show', $lead))
        ->assertSessionHasNoErrors();

    Mail::assertQueued(LeadVisioScheduled::class, fn (LeadVisioScheduled $mail): bool => $mail->hasTo('lea@example.com'));
    expect($lead->refresh()->visio_at?->format('H:i'))->toBe('10:00');

    $this->actingAs($user)
        ->get(route('leads.show', $lead))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('lead.visio_at', fn (string $value): bool => str_contains($value, '10:00'))
            ->where('lead.visio_meet_link', null));
});

test('the date is required, well formed and in the future', function (): void {
    $user = User::factory()->create();
    $lead = Lead::factory()->create(['email' => 'lea@example.com']);

    $this->actingAs($user)->from(route('leads.show', $lead))
        ->post(route('leads.visio', $lead), [])->assertSessionHasErrors('visio_at');
    $this->actingAs($user)->from(route('leads.show', $lead))
        ->post(route('leads.visio', $lead), ['visio_at' => 'demain'])->assertSessionHasErrors('visio_at');
    $this->actingAs($user)->from(route('leads.show', $lead))
        ->post(route('leads.visio', $lead), ['visio_at' => now()->subDay()->format('Y-m-d\TH:i')])->assertSessionHasErrors('visio_at');

    Mail::assertNothingQueued();
});

test('guests cannot schedule', function (): void {
    $lead = Lead::factory()->create();

    $this->post(route('leads.visio', $lead), ['visio_at' => '2030-01-01T10:00'])->assertRedirect(route('login'));
});

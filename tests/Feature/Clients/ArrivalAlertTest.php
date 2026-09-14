<?php

declare(strict_types=1);

use App\Actions\Clients\SendArrivalAlerts;
use App\Events\DashboardUpdated;
use App\Mail\ArrivalApproaching;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Mail;

beforeEach(function (): void {
    Event::fake([DashboardUpdated::class]);
    Mail::fake();
});

/** Un dossier client qui s'installe dans `$days` jours, suivi par un membre. */
function arriving(int $days, ?User $assignee = null): Lead
{
    return Lead::factory()->converted()->create([
        'arrival_at' => today()->addDays($days),
        'assigned_to' => ($assignee ?? User::factory()->create())->id,
    ]);
}

test('each milestone alerts the followers once, and only once', function (): void {
    $member = User::factory()->create(['email' => 'charles@example.com']);
    $client = arriving(15, $member);

    expect(resolve(SendArrivalAlerts::class)->handle())->toBe(1);

    Mail::assertQueued(ArrivalApproaching::class, fn (ArrivalApproaching $mail): bool => $mail->days === 15
        && $mail->hasTo('charles@example.com'));
    expect($client->refresh()->arrival_alerted_days)->toBe([15]);

    // Le lendemain, rien : le palier J-15 est passé, J-7 n'est pas atteint.
    Mail::fake();
    expect(resolve(SendArrivalAlerts::class)->handle())->toBe(0);
    Mail::assertNothingQueued();

    // À J-7, le palier suivant part.
    $client->forceFill(['arrival_at' => today()->addDays(7)])->save();
    expect(resolve(SendArrivalAlerts::class)->handle())->toBe(1);
    expect($client->refresh()->arrival_alerted_days)->toBe([15, 7]);

    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->resource === 'clients'
        && str_contains((string) $event->message, 'dans 7 jours'));
});

test('the two followers of a dossier are alerted together', function (): void {
    $first = User::factory()->create(['email' => 'charles@example.com']);
    $second = User::factory()->create(['email' => 'lea@example.com']);
    $client = arriving(3, $first);
    $client->forceFill(['co_assigned_to' => $second->id])->save();

    resolve(SendArrivalAlerts::class)->handle();

    Mail::assertQueued(ArrivalApproaching::class, fn (ArrivalApproaching $mail): bool => $mail->hasTo('charles@example.com')
        && $mail->hasTo('lea@example.com'));
});

test('a dossier without a follower alerts the agency instead of nobody', function (): void {
    config()->set('company.email', 'contact@example.com');
    Lead::factory()->converted()->create(['arrival_at' => today()->addDays(3), 'assigned_to' => null, 'co_assigned_to' => null]);

    resolve(SendArrivalAlerts::class)->handle();

    Mail::assertQueued(ArrivalApproaching::class, fn (ArrivalApproaching $mail): bool => $mail->hasTo('contact@example.com'));
});

test('a late run catches up with the nearest milestone only, never three e-mails at once', function (): void {
    // Personne n'a relevé les alertes : le client arrive après-demain.
    $client = arriving(2);

    expect(resolve(SendArrivalAlerts::class)->handle())->toBe(1);

    Mail::assertQueuedCount(1);
    Mail::assertQueued(ArrivalApproaching::class, fn (ArrivalApproaching $mail): bool => $mail->days === 3);
    expect($client->refresh()->arrival_alerted_days)->toBe([3]);
});

test('leads that are not clients, arrivals already passed and dates that are missing are left alone', function (): void {
    // Un lead non converti, même avec une date d'arrivée.
    Lead::factory()->create(['arrival_at' => today()->addDays(3)]);
    // Un client déjà installé.
    Lead::factory()->converted()->create(['arrival_at' => today()->subDay()]);
    // Un client sans date.
    Lead::factory()->converted()->create(['arrival_at' => null]);
    // Un client dont l'installation est encore loin.
    Lead::factory()->converted()->create(['arrival_at' => today()->addDays(40)]);

    expect(resolve(SendArrivalAlerts::class)->handle())->toBe(0);
    Mail::assertNothingQueued();
});

test('the command runs the alerts', function (): void {
    arriving(7);

    $this->artisan('clients:alert-arrivals')
        ->expectsOutputToContain('1 alerte(s) envoyée(s).')
        ->assertSuccessful();

    Mail::assertQueuedCount(1);
});

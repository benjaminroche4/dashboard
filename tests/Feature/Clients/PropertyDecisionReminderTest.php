<?php

declare(strict_types=1);

use App\Actions\Clients\SendPropertyDecisionReminders;
use App\Actions\Clients\SetClientPropertyStatus;
use App\Enums\PropertyApplicationStatus;
use App\Enums\VisitStatus;
use App\Events\DashboardUpdated;
use App\Mail\PropertyDecisionDue;
use App\Models\Lead;
use App\Models\Property;
use App\Models\User;
use App\Models\Visit;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Mail;
use Inertia\Testing\AssertableInertia;

beforeEach(function (): void {
    Event::fake([DashboardUpdated::class]);
    Mail::fake();
});

/** Dossier converti, bien rattaché « À décider », visite effectuée il y a `$days` jours. */
function undecided(int $days = 3): array
{
    $advisor = User::factory()->create();
    $lead = Lead::factory()->converted()->create(['assigned_to' => $advisor->id, 'first_name' => 'Anne', 'last_name' => 'Delahaye']);
    $property = Property::factory()->create(['street' => '12 rue Oberkampf']);
    $lead->properties()->attach($property->id, ['status' => PropertyApplicationStatus::Pending->value]);
    Visit::factory()->for($lead)->for($property)->create([
        'status' => VisitStatus::Done,
        'scheduled_at' => now()->subDays($days),
    ]);

    return [$lead, $property, $advisor];
}

test('a property left undecided after the visit reminds the people following the file', function (): void {
    [$lead, $property, $advisor] = undecided();

    expect(resolve(SendPropertyDecisionReminders::class)->handle())->toBe(1);

    Mail::assertQueued(PropertyDecisionDue::class, fn (PropertyDecisionDue $mail): bool => $mail->hasTo($advisor->email)
        && $mail->property->is($property)
        && $mail->lead->is($lead));

    // Les personnes de suivi sont citées : le toast ne vise qu'elles.
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->resource === 'clients'
        && str_contains((string) $event->message, 'attend toujours la décision')
        && $event->payload['mentions'] === [$advisor->id]);
});

test('the reminder waits for the delay, and never fires on a decided property', function (): void {
    // Visite d'il y a une heure : trop tôt, le délai est de 48 h.
    [$fresh] = undecided(0);
    $fresh->visits()->update(['scheduled_at' => now()->subHour()]);
    expect(resolve(SendPropertyDecisionReminders::class)->handle())->toBe(0);

    // Bien tranché : plus rien à rappeler, même longtemps après.
    [$decided, $property] = undecided(10);
    $decided->properties()->updateExistingPivot($property->id, ['status' => PropertyApplicationStatus::Declined->value]);
    expect(resolve(SendPropertyDecisionReminders::class)->handle())->toBe(0);

    Mail::assertNotQueued(PropertyDecisionDue::class);
});

test('a property waiting keeps being reminded, but only once per delay', function (): void {
    [$lead] = undecided(5);

    expect(resolve(SendPropertyDecisionReminders::class)->handle())->toBe(1)
        // Juste après, rien : on ne harcèle pas.
        ->and(resolve(SendPropertyDecisionReminders::class)->handle())->toBe(0);

    // Le délai passé, la relance repart : un bien qui plaît part vite.
    $lead->properties()->newPivotQuery()->update(['decision_reminded_at' => now()->subHours(SendPropertyDecisionReminders::hours() + 1)]);
    expect(resolve(SendPropertyDecisionReminders::class)->handle())->toBe(1);

    Mail::assertQueuedCount(2);
});

test('deciding again restarts the reminder', function (): void {
    [$lead, $property, $advisor] = undecided(4);

    resolve(SendPropertyDecisionReminders::class)->handle();

    // Le bien repasse « À décider » : le compteur de relance repart de zéro.
    resolve(SetClientPropertyStatus::class)
        ->handle($lead, $property, PropertyApplicationStatus::Pending, $advisor);

    expect($lead->properties()->first()->getRelationValue('pivot')->decision_reminded_at)->toBeNull()
        ->and(resolve(SendPropertyDecisionReminders::class)->handle())->toBe(1);
});

test('the visit page says when the team is relaunched about a pending decision', function (): void {
    $hours = SendPropertyDecisionReminders::hours();
    $client = Lead::factory()->converted()->create();
    $property = Property::factory()->create();
    $visit = Visit::factory()->create([
        'lead_id' => $client->id,
        'property_id' => $property->id,
        'status' => VisitStatus::Done,
        'scheduled_at' => now()->subHours($hours + 2),
        'report' => 'Visite faite, le client hésite.',
        'report_submitted_at' => now()->subHours($hours + 1),
    ]);
    $client->properties()->attach($property, ['status' => PropertyApplicationStatus::Pending->value]);

    // Jamais relancé : la première relance court depuis la visite.
    $this->actingAs(User::factory()->create())
        ->get(route('clients.visits.show', $visit))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('outcome.decision_due', true)
            ->where('outcome.reminded_at', null)
            ->where('outcome.reminder_at', $visit->scheduled_at->copy()->addHours($hours)->toIso8601String())
            ->etc());

    // Une fois relancé, la suivante court depuis ce rappel.
    $remindedAt = now()->subMinutes(30);
    $client->properties()->updateExistingPivot($property->id, ['decision_reminded_at' => $remindedAt]);

    $this->actingAs(User::factory()->create())
        ->get(route('clients.visits.show', $visit))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('outcome.reminded_at', $remindedAt->toIso8601String())
            ->where('outcome.reminder_at', $remindedAt->copy()->addHours($hours)->toIso8601String())
            ->etc());
});

test('a decided property announces no further reminder', function (): void {
    $client = Lead::factory()->converted()->create();
    $property = Property::factory()->create();
    $visit = Visit::factory()->create([
        'lead_id' => $client->id,
        'property_id' => $property->id,
        'status' => VisitStatus::Done,
        'scheduled_at' => now()->subDays(3),
        'report' => 'Visite faite.',
        'report_submitted_at' => now()->subDays(3),
    ]);
    $client->properties()->attach($property, [
        'status' => PropertyApplicationStatus::Applied->value,
        'status_at' => now()->subDay(),
    ]);

    $this->actingAs(User::factory()->create())
        ->get(route('clients.visits.show', $visit))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('outcome.status', 'applied')
            ->where('outcome.reminder_at', null)
            ->where('outcome.decision_due', false)
            ->etc());
});

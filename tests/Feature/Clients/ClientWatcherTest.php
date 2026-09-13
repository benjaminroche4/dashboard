<?php

declare(strict_types=1);

use App\Mail\VisitScheduled;
use App\Models\Lead;
use App\Models\LeadWatcher;
use App\Models\User;
use App\Models\Visit;
use App\Support\HouseholdMail;
use Illuminate\Support\Facades\Mail;
use Inertia\Testing\AssertableInertia;

test('a follow-up person is added to the dossier, updated and removed', function (): void {
    $user = User::factory()->staff()->create();
    $lead = Lead::factory()->converted()->create();

    $this->actingAs($user)
        ->post(route('clients.watchers.store', $lead), [
            'name' => 'Claire Martin',
            // La casse ne doit pas faire passer deux fois la même personne.
            'email' => 'Claire.Martin@Exemple.com',
            'phone' => '+33 6 11 22 33 44',
            'role' => 'Mère du locataire',
        ])
        ->assertSessionHasNoErrors();

    $watcher = LeadWatcher::query()->sole();
    expect($watcher->email)->toBe('claire.martin@exemple.com')
        ->and($watcher->phone)->toBe('+33 6 11 22 33 44')
        ->and($watcher->lead_id)->toBe($lead->id)
        ->and($lead->notes()->first()?->body)->toContain('Claire Martin');

    $this->actingAs($user)
        ->get(route('clients.show', $lead))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->has('watchers', 1)
            ->where('watchers.0.name', 'Claire Martin')
            ->where('watchers.0.phone', '+33 6 11 22 33 44')
            ->where('watchers.0.role', 'Mère du locataire'));

    $this->actingAs($user)
        ->patch(route('clients.watchers.update', [$lead, $watcher]), [
            'name' => 'Claire Martin',
            'email' => 'claire.martin@exemple.com',
            'role' => 'Sa mère',
        ])
        ->assertSessionHasNoErrors();

    expect($watcher->refresh()->role)->toBe('Sa mère');

    $this->actingAs($user)
        ->delete(route('clients.watchers.destroy', [$lead, $watcher]))
        ->assertSessionHasNoErrors();

    expect(LeadWatcher::query()->count())->toBe(0);
});

test('the same address does not follow one dossier twice', function (): void {
    $user = User::factory()->staff()->create();
    $lead = Lead::factory()->converted()->create();

    $this->actingAs($user)->post(route('clients.watchers.store', $lead), [
        'name' => 'Claire Martin',
        'email' => 'claire@exemple.com',
    ])->assertSessionHasNoErrors();

    $this->actingAs($user)
        ->post(route('clients.watchers.store', $lead), ['name' => 'Claire', 'email' => 'claire@exemple.com'])
        ->assertSessionHasErrors('email');

    // Sur un autre dossier, en revanche, elle peut suivre aussi.
    $other = Lead::factory()->converted()->create();
    $this->actingAs($user)
        ->post(route('clients.watchers.store', $other), ['name' => 'Claire', 'email' => 'claire@exemple.com'])
        ->assertSessionHasNoErrors();
});

test('the follow-up people are in copy of the e-mails sent to the household', function (): void {
    Mail::fake();
    $user = User::factory()->staff()->create();
    $lead = Lead::factory()->converted()->create(['email' => 'client@exemple.com', 'assigned_to' => $user->id]);
    $lead->watchers()->create(['name' => 'Claire Martin', 'email' => 'claire@exemple.com']);

    HouseholdMail::send($lead->refresh()->load('watchers'), new VisitScheduled(
        Visit::factory()->for($lead)->create()->load(['property', 'lead']),
        'BEGIN:VCALENDAR\r\nEND:VCALENDAR',
    ));

    Mail::assertQueued(VisitScheduled::class, fn (VisitScheduled $mail): bool => $mail->hasCc('claire@exemple.com') && $mail->hasTo('client@exemple.com'));
});

test('a follow-up person cannot be given an unreachable number', function (): void {
    $user = User::factory()->staff()->create();
    $lead = Lead::factory()->converted()->create();

    $this->actingAs($user)
        ->post(route('clients.watchers.store', $lead), [
            'name' => 'Claire Martin',
            'email' => 'claire@exemple.com',
            'phone' => 'appelez-moi',
        ])
        ->assertSessionHasErrors('phone');
});

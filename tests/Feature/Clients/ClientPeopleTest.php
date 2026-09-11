<?php

declare(strict_types=1);

use App\Enums\LeadStatus;
use App\Enums\Offer;
use App\Mail\VisitScheduled;
use App\Models\Lead;
use App\Models\Property;
use App\Models\User;
use App\Models\Visit;
use Illuminate\Support\Facades\Mail;

it('records a second tenant and a second follower on a dossier', function (): void {
    $admin = User::factory()->staff()->create();
    $second = User::factory()->staff()->create(['name' => 'Charles Petit']);
    $lead = Lead::factory()->converted()->create(['first_name' => 'Bruno', 'last_name' => 'Mata', 'assigned_to' => $admin->id]);

    $this->actingAs($admin)
        ->patch(route('clients.people', $lead), [
            'co_first_name' => 'charles',
            'co_last_name' => 'mata',
            'co_email' => 'charles@example.com',
            'co_phone' => '+33 6 12 34 56 78',
            'co_assigned_to' => $second->id,
        ])
        ->assertRedirect();

    $lead->refresh();
    expect($lead->co_first_name)->toBe('Charles')
        ->and($lead->co_last_name)->toBe('Mata')
        ->and($lead->co_email)->toBe('charles@example.com')
        ->and($lead->co_assigned_to)->toBe($second->id)
        // Le nom du dossier prend les prénoms, pas les noms de famille.
        ->and($lead->householdName())->toBe('Bruno & Charles')
        ->and($lead->notes()->count())->toBe(2);
});

it('names the dossier with the tenant full name when there is only one', function (): void {
    $lead = Lead::factory()->converted()->create(['first_name' => 'Bruno', 'last_name' => 'Mata']);

    expect($lead->householdName())->toBe('Bruno Mata');
});

it('refuses an invalid second tenant e-mail', function (): void {
    $admin = User::factory()->staff()->create();
    $lead = Lead::factory()->converted()->create();

    $this->actingAs($admin)
        ->patch(route('clients.people', $lead), ['co_email' => 'pas-une-adresse'])
        ->assertSessionHasErrors('co_email');
});

it('answers 404 on a lead that is not a client yet', function (): void {
    $admin = User::factory()->staff()->create();
    $lead = Lead::factory()->create(['status' => LeadStatus::InProgress]);

    $this->actingAs($admin)
        ->patch(route('clients.people', $lead), ['co_first_name' => 'Charles'])
        ->assertNotFound();
});

it('sends the visit confirmation to both tenants and copies both followers', function (): void {
    Mail::fake();

    $advisor = User::factory()->staff()->create(['name' => 'Admin']);
    $second = User::factory()->staff()->create(['name' => 'Charles Petit']);
    $lead = Lead::factory()->converted()->create([
        'email' => 'bruno@example.com',
        'co_first_name' => 'Charles',
        'co_email' => 'charles@example.com',
        'assigned_to' => $advisor->id,
        'co_assigned_to' => $second->id,
        // Formule « Accompagné » : le client vient, il reçoit la confirmation.
        'offer' => Offer::Accompagne,
    ]);
    $property = Property::factory()->create();

    $this->actingAs($advisor)
        ->post(route('clients.visits.store'), [
            'lead_id' => $lead->id,
            'property_id' => $property->id,
            'scheduled_at' => now()->addDay()->format('Y-m-d\TH:i'),
            'notify_client' => true,
        ])
        ->assertRedirect();

    expect(Visit::query()->count())->toBe(1);

    Mail::assertQueued(VisitScheduled::class, fn (VisitScheduled $mail): bool => $mail->hasTo('bruno@example.com')
        && $mail->hasTo('charles@example.com')
        && $mail->hasCc($advisor->email)
        && $mail->hasCc($second->email));
});

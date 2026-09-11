<?php

declare(strict_types=1);

use App\Enums\LeaseType;
use App\Enums\Offer;
use App\Enums\PropertyFloor;
use App\Enums\VisitMode;
use App\Enums\VisitStatus;
use App\Events\DashboardUpdated;
use App\Mail\VisitScheduled;
use App\Models\Agent;
use App\Models\Lead;
use App\Models\Owner;
use App\Models\Property;
use App\Models\User;
use App\Models\Visit;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia;

beforeEach(fn () => Event::fake([DashboardUpdated::class]));

test('the visits page lists the visits with client and property, and ships no directory it does not use', function (): void {
    $this->get(route('clients.visits'))->assertRedirect(route('login'));

    $client = Lead::factory()->converted()->create(['first_name' => 'Léa', 'last_name' => 'Durand', 'offer' => Offer::Accompagne]);
    Lead::factory()->create();
    $property = Property::factory()->create(['title' => 'T2 lumineux · 11e']);
    Visit::factory()->create(['lead_id' => $client->id, 'property_id' => $property->id, 'scheduled_at' => now()->addDay()]);
    Visit::factory()->status(VisitStatus::Done)->create(['lead_id' => $client->id, 'property_id' => $property->id]);

    $this->actingAs(User::factory()->create())
        ->get(route('clients.visits'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('clients/visits')
            ->has('visits', 2)
            ->where('visits.0.client.name', 'Léa Durand')
            ->where('visits.0.property.label', 'T2 lumineux · 11e')
            ->where('visits.0.status_label', 'Planifiée')
            ->where('visits.1.status_label', 'Effectuée')
            ->has('statuses', 3)
            // La liste n'affiche que des visites : les annuaires du formulaire
            // (clients, biens, agents, propriétaires, agences) n'ont rien à y faire.
            ->missing('clients')
            ->missing('properties')
            ->missing('leaseTypes')
            ->missing('agents')
            ->where('realtimeOnly', ['visits']));
});

test('scheduling a visit with a new property adds it to the directory and notes the lead', function (): void {
    $member = User::factory()->create();
    $client = Lead::factory()->converted()->create(['first_name' => 'Léa', 'last_name' => 'Durand', 'offer' => Offer::Accompagne]);

    $this->actingAs($member)
        ->from(route('clients.visits'))
        ->post(route('clients.visits.store'), ['lead_id' => $client->id, 'scheduled_at' => '2026-09-15 10:30', 'property' => ['street' => '']])
        ->assertSessionHasErrors(['property.street']);

    $this->actingAs($member)
        ->from(route('clients.visits'))
        ->post(route('clients.visits.store'), [
            'lead_id' => $client->id,
            'scheduled_at' => '2026-09-15 10:30',
            'property' => ['street' => '12 rue Oberkampf', 'postal_code' => '75011', 'city' => 'Paris', 'rent_cents' => 150_000],
            'notes' => 'Rendez-vous devant l’immeuble.',
        ])
        ->assertRedirect(route('clients.visits'))
        ->assertSessionHasNoErrors();

    $property = Property::query()->sole();
    $visit = Visit::query()->sole();
    expect($property->street)->toBe('12 rue Oberkampf')
        ->and($property->district)->toBe(11)
        ->and($property->created_by)->toBe($member->id)
        ->and($visit->property_id)->toBe($property->id)
        ->and($visit->lead_id)->toBe($client->id)
        ->and($visit->status)->toBe(VisitStatus::Planned)
        ->and($visit->scheduled_at->format('Y-m-d H:i'))->toBe('2026-09-15 10:30')
        ->and($client->notes()->latest()->value('body'))->toBe('Visite planifiée le 15 septembre 2026 à 10:30 : 12 rue Oberkampf.');
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->resource === 'properties');
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->resource === 'visits' && str_contains((string) $event->message, 'Léa Durand'));
});

test('a new property already known at the same address is reused instead of duplicated', function (): void {
    $member = User::factory()->create();
    $client = Lead::factory()->converted()->create(['offer' => Offer::Accompagne]);
    $known = Property::factory()->create([
        'street' => '53, rue Christelle Lefort',
        'postal_code' => '75018',
        'city' => 'Paris',
    ]);

    // Même adresse, ponctuation et casse différentes : la visite reprend le bien.
    $this->actingAs($member)
        ->post(route('clients.visits.store'), [
            'lead_id' => $client->id,
            'scheduled_at' => '2026-09-15 10:30',
            'property' => ['street' => '53 rue christelle-lefort', 'postal_code' => '75018', 'city' => 'paris'],
        ])
        ->assertRedirect(route('clients.visits'))
        ->assertSessionHasNoErrors();

    expect(Property::query()->count())->toBe(1)
        ->and(Visit::query()->sole()->property_id)->toBe($known->id);

    // Une autre adresse crée bien un nouveau bien.
    $this->actingAs($member)
        ->post(route('clients.visits.store'), [
            'lead_id' => $client->id,
            'scheduled_at' => '2026-09-16 10:30',
            'property' => ['street' => '54, rue Christelle Lefort', 'postal_code' => '75018', 'city' => 'Paris'],
        ])
        ->assertSessionHasNoErrors();

    expect(Property::query()->count())->toBe(2);
});

test('an entrusted client needs a member on the visit and is never emailed', function (): void {
    Mail::fake();
    $member = User::factory()->create();
    $client = Lead::factory()->converted()->create(['offer' => Offer::Confie, 'email' => 'lea@example.com']);
    $property = Property::factory()->create();

    // Formule « Confié » : l'équipe visite sans le client, un membre doit s'en charger.
    $this->actingAs($member)
        ->post(route('clients.visits.store'), [
            'lead_id' => $client->id,
            'property_id' => $property->id,
            'scheduled_at' => '2026-09-15 10:30',
        ])
        ->assertSessionHasErrors('assigned_to');

    // Et même en cochant la case, le client n'est pas invité : il ne vient pas.
    $this->actingAs($member)
        ->post(route('clients.visits.store'), [
            'lead_id' => $client->id,
            'property_id' => $property->id,
            'scheduled_at' => '2026-09-15 10:30',
            'assigned_to' => $member->id,
            'notify_client' => true,
        ])
        ->assertSessionHasNoErrors();

    expect(Visit::query()->sole()->assigned_to)->toBe($member->id);
    Mail::assertNotQueued(VisitScheduled::class);
});

test('a visit carries its assignee and a new property keeps floor, lease type, charges and photos', function (): void {
    Storage::fake('public');
    $member = User::factory()->create();
    $assignee = User::factory()->create(['name' => 'Charles']);
    $client = Lead::factory()->converted()->create(['offer' => Offer::Accompagne]);
    $owner = Owner::factory()->create();

    // Sans code postal parisien, l'arrondissement est obligatoire.
    $this->actingAs($member)
        ->post(route('clients.visits.store'), ['lead_id' => $client->id, 'scheduled_at' => '2026-09-15 10:30', 'property' => ['street' => '3 rue de la Paix']])
        ->assertSessionHasErrors(['property.district']);

    $this->actingAs($member)
        ->post(route('clients.visits.store'), [
            'lead_id' => $client->id,
            'assigned_to' => $assignee->id,
            'scheduled_at' => '2026-09-15 10:30',
            'property' => [
                'street' => '3 rue de la Paix',
                'district' => 2,
                'floor' => 'top',
                'lease_type' => 'mobility',
                'property_type' => 't2',
                'furnished' => 'furnished',
                'surface_m2' => 38,
                'rent_cents' => 180_000,
                'charges_cents' => 12_000,
                'charges_included' => true,
                'listing_url' => 'https://www.seloger.com/annonces/1.htm',
                'owner_id' => $owner->id,
                'notes' => 'Digicode 1234.',
                'photos' => [UploadedFile::fake()->image('salon.jpg'), UploadedFile::fake()->image('cuisine.png')],
            ],
            'notes' => 'Client très intéressé.',
        ])
        ->assertRedirect(route('clients.visits'))
        ->assertSessionHasNoErrors();

    $property = Property::query()->sole();
    $visit = Visit::query()->sole();
    expect($property->district)->toBe(2)
        ->and($property->floor)->toBe(PropertyFloor::Top)
        ->and($property->lease_type)->toBe(LeaseType::Mobility)
        ->and($property->charges_cents)->toBe(12_000)
        ->and($property->charges_included)->toBeTrue()
        ->and($property->owner_id)->toBe($owner->id)
        ->and($property->photos)->toHaveCount(2)
        ->and($property->photoUrls()[0])->toContain('/storage/properties/')
        ->and($visit->assigned_to)->toBe($assignee->id)
        ->and($visit->notes)->toBe('Client très intéressé.');
    Storage::disk('public')->assertExists($property->photos[0]);

    $this->actingAs($member)
        ->get(route('clients.visits'))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('visits.0.assignee.name', 'Charles'));

    $this->actingAs($member)
        ->post(route('clients.visits.store'), ['lead_id' => $client->id, 'scheduled_at' => '2026-09-15 10:30', 'property' => ['street' => 'x', 'district' => 3, 'photos' => [UploadedFile::fake()->create('plan.pdf', 100, 'application/pdf')]]])
        ->assertSessionHasErrors(['property.photos.0']);
});

test('scheduling a visit on an existing property reuses it and inherits its agent', function (): void {
    $client = Lead::factory()->converted()->create(['offer' => Offer::Accompagne]);
    $property = Property::factory()->create(['agent_id' => Agent::factory()->create()->id]);

    $this->actingAs(User::factory()->create())
        ->post(route('clients.visits.store'), ['lead_id' => $client->id, 'property_id' => $property->id, 'scheduled_at' => now()->addDays(2)->toDateTimeString()])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect(Property::query()->count())->toBe(1)
        ->and(Visit::query()->sole()->agent_id)->toBe($property->agent_id);
});

test('the schedule page is dedicated, lists clients and properties, and preselects the client given by uuid', function (): void {
    $this->get(route('clients.visits.create'))->assertRedirect(route('login'));

    $client = Lead::factory()->converted()->create(['first_name' => 'Léa', 'last_name' => 'Durand', 'offer' => Offer::Accompagne]);
    $notClient = Lead::factory()->create();
    Property::factory()->create();

    $this->actingAs(User::factory()->create())
        ->get(route('clients.visits.create', ['client' => $client->uuid]))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('clients/visit-create')
            ->where('defaultClientId', $client->id)
            ->has('clients', 1)
            ->where('clients.0.name', 'Léa Durand')
            ->has('properties', 1)
            ->has('agents'));

    $this->actingAs(User::factory()->create())
        ->get(route('clients.visits.create', ['client' => $notClient->uuid]))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page->where('defaultClientId', null));

    $this->actingAs(User::factory()->create())
        ->get(route('clients.visits.create'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page->where('defaultClientId', null));
});

test('a visit is marked done or cancelled, rescheduled, and only admins delete it', function (): void {
    $visit = Visit::factory()->create();
    $member = User::factory()->create();

    $this->actingAs($member)
        ->patch(route('clients.visits.update', $visit), ['status' => 'done'])
        ->assertRedirect();
    expect($visit->refresh()->status)->toBe(VisitStatus::Done);

    $this->actingAs($member)
        ->patch(route('clients.visits.update', $visit), ['scheduled_at' => '2026-10-01 14:00', 'notes' => 'Reportée.'])
        ->assertRedirect();
    expect($visit->refresh()->scheduled_at->format('Y-m-d H:i'))->toBe('2026-10-01 14:00')
        ->and($visit->notes)->toBe('Reportée.');

    $this->actingAs($member)->patch(route('clients.visits.update', $visit), ['status' => 'lost'])->assertSessionHasErrors(['status']);

    $this->actingAs($member)->delete(route('clients.visits.destroy', $visit))->assertForbidden();
    $this->actingAs(User::factory()->admin()->create())->delete(route('clients.visits.destroy', $visit))->assertRedirect();
    expect(Visit::query()->count())->toBe(0)
        ->and(Property::query()->count())->toBe(1);
});

test('visit routes use the uuid and refuse the numeric id', function (): void {
    $visit = Visit::factory()->create();
    $admin = User::factory()->admin()->create();

    expect(Str::isUuid($visit->uuid))->toBeTrue()
        ->and(route('clients.visits.update', $visit))->toEndWith('/clients/visits/'.$visit->uuid);

    $this->actingAs($admin)->patch('/clients/visits/'.$visit->id, ['status' => 'done'])->assertNotFound();
    $this->actingAs($admin)->delete('/clients/visits/'.$visit->id)->assertNotFound();
});

test('the client is emailed the visit confirmation only when asked, in their language, with the ICS invite', function (): void {
    Mail::fake();
    $advisor = User::factory()->create(['name' => 'Charles Martin', 'email' => 'charles@relocation-in-paris.fr']);
    $client = Lead::factory()->converted()->create(['first_name' => 'Léa', 'email' => 'lea@example.com', 'language' => 'en', 'assigned_to' => $advisor->id, 'offer' => Offer::Accompagne]);
    $property = Property::factory()->create(['title' => 'T2 lumineux · 11e', 'street' => '12 rue Oberkampf', 'postal_code' => '75011', 'city' => 'Paris']);
    $member = User::factory()->create();

    $this->actingAs($member)
        ->post(route('clients.visits.store'), ['lead_id' => $client->id, 'property_id' => $property->id, 'scheduled_at' => '2026-09-15 10:30'])
        ->assertRedirect();
    Mail::assertNothingQueued();

    $this->actingAs($member)
        ->post(route('clients.visits.store'), ['lead_id' => $client->id, 'property_id' => $property->id, 'scheduled_at' => '2026-09-16 14:00', 'notify_client' => true])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    Mail::assertQueued(VisitScheduled::class, function (VisitScheduled $mail): bool {
        expect($mail->hasTo('lea@example.com'))->toBeTrue()
            ->and($mail->hasReplyTo('charles@relocation-in-paris.fr'))->toBeTrue()
            ->and($mail->locale)->toBe('en')
            ->and($mail->attachments())->toHaveCount(1);

        app()->setLocale('en');
        $rendered = $mail->render();
        $subject = $mail->envelope()->subject;
        app()->setLocale('fr');

        return $subject === 'Your viewing is confirmed: Wednesday 16 September at 14:00'
            && str_contains($rendered, '12 rue Oberkampf, 75011 Paris')
            && str_contains($rendered, 'Your viewing is confirmed');
    });
    expect($client->notes()->where('body', 'like', 'Confirmation de visite envoyée à lea@example.com%')->exists())->toBeTrue();
});

test('asking to notify a client without email schedules the visit without sending anything', function (): void {
    Mail::fake();
    $client = Lead::factory()->converted()->create(['email' => null, 'phone' => '+33 6 12 34 56 78', 'offer' => Offer::Accompagne]);
    $property = Property::factory()->create();

    $this->actingAs(User::factory()->create())
        ->post(route('clients.visits.store'), ['lead_id' => $client->id, 'property_id' => $property->id, 'scheduled_at' => '2026-09-16 14:00', 'notify_client' => '1'])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect(Visit::query()->count())->toBe(1);
    Mail::assertNothingQueued();
});

test('a visit is made for the client, or by the client alone on the Accompagné offer', function (): void {
    $staff = User::factory()->create();
    $accompanied = Lead::factory()->converted()->create(['offer' => Offer::Accompagne]);
    $entrusted = Lead::factory()->converted()->create(['offer' => Offer::Confie]);
    $property = Property::factory()->create();

    // Par défaut, l'équipe visite pour le client.
    $this->actingAs($staff)->post(route('clients.visits.store'), [
        'lead_id' => $entrusted->id,
        'property_id' => $property->id,
        'assigned_to' => $staff->id,
        'scheduled_at' => now()->addDay()->format('Y-m-d\TH:i'),
    ])->assertSessionHasNoErrors();

    expect(Visit::query()->firstOrFail()->mode)->toBe(VisitMode::ForClient);

    // La visite autonome est refusée sur la formule « Confié ».
    $this->actingAs($staff)->post(route('clients.visits.store'), [
        'lead_id' => $entrusted->id,
        'property_id' => $property->id,
        'assigned_to' => $staff->id,
        'scheduled_at' => now()->addDays(2)->format('Y-m-d\TH:i'),
        'mode' => VisitMode::ClientAlone->value,
    ])->assertSessionHasErrors('mode');

    // Elle est acceptée sur « Accompagné », et notée sur le dossier.
    $this->actingAs($staff)->post(route('clients.visits.store'), [
        'lead_id' => $accompanied->id,
        'property_id' => $property->id,
        'scheduled_at' => now()->addDays(3)->format('Y-m-d\TH:i'),
        'mode' => VisitMode::ClientAlone->value,
    ])->assertSessionHasNoErrors();

    $visit = Visit::query()->where('lead_id', $accompanied->id)->firstOrFail();
    expect($visit->mode)->toBe(VisitMode::ClientAlone)
        ->and($accompanied->notes()->first()?->body)->toContain('visite autonome du client');

    // La liste et le formulaire portent le mode et ses deux options.
    $this->actingAs($staff)->get(route('clients.visits'))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->has('visitModes', 2)
            ->where('visitModes.1.value', 'client_alone')
            ->where('visits.0.mode_label', 'Visite autonome'));
});

test('changing the mode of a visit keeps the Accompagné rule', function (): void {
    $staff = User::factory()->create();
    $visit = Visit::factory()->create(['lead_id' => Lead::factory()->converted()->create(['offer' => Offer::Confie])]);

    $this->actingAs($staff)->patch(route('clients.visits.update', $visit), ['mode' => VisitMode::ClientAlone->value])
        ->assertSessionHasErrors('mode');

    $accompanied = Visit::factory()->create(['lead_id' => Lead::factory()->converted()->create(['offer' => Offer::Accompagne])]);
    $this->actingAs($staff)->patch(route('clients.visits.update', $accompanied), ['mode' => VisitMode::ClientAlone->value])
        ->assertSessionHasNoErrors();

    expect($accompanied->refresh()->mode)->toBe(VisitMode::ClientAlone);
});

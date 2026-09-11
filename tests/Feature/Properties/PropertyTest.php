<?php

declare(strict_types=1);

use App\Enums\PropertyFloor;
use App\Enums\PropertyStatus;
use App\Enums\PropertyType;
use App\Events\DashboardUpdated;
use App\Models\Agency;
use App\Models\Agent;
use App\Models\Lead;
use App\Models\Owner;
use App\Models\Partner;
use App\Models\Property;
use App\Models\User;
use App\Models\Visit;
use Illuminate\Http\Client\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia;

beforeEach(fn () => Event::fake([DashboardUpdated::class]));

test('the properties page lists every property with its agent, visits count and the form options', function (): void {
    $this->get(route('properties.index'))->assertRedirect(route('login'));

    $author = User::factory()->create(['name' => 'Admin']);
    $agent = Agent::factory()->create(['first_name' => 'Zoé', 'last_name' => 'Martin']);
    $property = Property::factory()->create(['title' => null, 'street' => '8 rue de Rivoli', 'postal_code' => '75004', 'agent_id' => $agent->id, 'created_by' => $author->id, 'created_at' => now()->subDay()]);
    Visit::factory()->count(2)->create(['property_id' => $property->id]);
    Property::factory()->create(['title' => 'T2 lumineux · 11e', 'created_at' => now()]);

    $this->actingAs($author)
        ->get(route('properties.index'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('properties/index')
            ->has('properties', 2)
            ->where('properties.0.label', 'T2 lumineux · 11e')
            ->where('properties.1.label', '8 rue de Rivoli')
            ->where('properties.1.agent.name', 'Zoé Martin')
            ->where('properties.1.visits_count', 2)
            ->where('properties.1.creator', 'Admin')
            ->has('propertyTypes', count(PropertyType::cases()))
            ->has('agents', 1)
            // La pagination se recharge avec la liste.
            ->where('realtimeOnly', ['properties', 'pagination']));
});

test('any member adds and updates a property, the district being derived from the postal code', function (): void {
    $member = User::factory()->create();

    $this->actingAs($member)
        ->from(route('properties.index'))
        ->post(route('properties.store'), ['street' => '', 'listing_url' => 'pas-une-url'])
        ->assertSessionHasErrors(['street', 'listing_url']);

    $this->actingAs($member)
        ->from(route('properties.index'))
        ->post(route('properties.store'), [
            'street' => '5 rue de Bretagne',
            'postal_code' => '75003',
            'city' => 'Paris',
            'property_type' => 't2',
            'furnished' => 'furnished',
            'rent_cents' => 180_000,
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('properties.show', Property::query()->sole()));

    $property = Property::query()->sole();
    // Le nom du bien est calculé, jamais saisi : type, meublé, surface, quartier.
    expect($property->district)->toBe(3)
        ->and($property->property_type)->toBe(PropertyType::T2)
        ->and($property->created_by)->toBe($member->id)
        ->and($property->title)->toBe('T2 meublé · 3e')
        ->and($property->label())->toBe('T2 meublé · 3e');
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->resource === 'properties' && str_contains((string) $event->message, 'T2 meublé · 3e'));

    // Un titre envoyé à la main est ignoré ; le nom suit les caractéristiques.
    $this->actingAs($member)
        ->patch(route('properties.update', $property), [
            'title' => 'Joli T2',
            'street' => '5 rue de Bretagne',
            'district' => 4,
            'property_type' => 't2',
            'surface_m2' => 42,
        ])
        ->assertRedirect(route('properties.show', $property));

    expect($property->refresh()->label())->toBe('T2 · 42 m² · 4e')
        ->and($property->district)->toBe(4);
});

test('a property carries the details of the listing form: rooms, orientation, deposit, amenities', function (): void {
    $member = User::factory()->create();

    // Le formulaire propose les orientations et les équipements du site.
    $this->actingAs($member)->get(route('properties.create'))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->has('orientations')
            ->has('amenities'));

    $this->actingAs($member)->post(route('properties.store'), [
        'street' => '12 rue Oberkampf',
        'postal_code' => '75011',
        'property_type' => 't2',
        'rooms' => 3,
        'bedrooms' => 2,
        'bathrooms' => 1,
        'surface_m2' => 58,
        'floor' => '4',
        'building_floors' => 6,
        'orientations' => ['south', 'east'],
        'amenities' => ['elevator', 'balcony', 'wifi'],
        'rent_cents' => 210_000,
        'deposit_cents' => 210_000,
    ])->assertSessionHasNoErrors();

    $property = Property::query()->sole();
    expect($property->bedrooms)->toBe(2)
        ->and($property->bathrooms)->toBe(1)
        ->and($property->building_floors)->toBe(6)
        ->and($property->deposit_cents)->toBe(210_000)
        ->and($property->orientations)->toBe(['south', 'east'])
        ->and($property->amenities)->toBe(['elevator', 'balcony', 'wifi']);

    // La fiche donne les libellés, prêts à afficher.
    $this->actingAs($member)->get(route('properties.show', $property))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('property.orientation_labels', ['Sud', 'Est'])
            ->where('property.amenity_labels', ['Ascenseur', 'Balcon', 'Wi-Fi'])
            ->where('property.bedrooms', 2)
            ->where('property.deposit_cents', 210_000));

    // Un équipement inconnu et un doublon sont refusés.
    $this->actingAs($member)
        ->from(route('properties.index'))
        ->patch(route('properties.update', $property), [
            'street' => '12 rue Oberkampf',
            'amenities' => ['jacuzzi'],
            'orientations' => ['north', 'north'],
        ])
        ->assertSessionHasErrors(['amenities.0', 'orientations.1']);
});

test('a property carries its partner, chosen next to the agent and the owner', function (): void {
    $member = User::factory()->create();
    $partner = Partner::factory()->create(['name' => 'Garantme']);

    // Le formulaire propose l'annuaire des partenaires et leurs types.
    $this->actingAs($member)->get(route('properties.create'))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('partners.0.name', 'Garantme')
            ->has('partnerTypes'));

    $this->actingAs($member)->post(route('properties.store'), [
        'street' => '12 rue Oberkampf',
        'postal_code' => '75011',
        'partner_id' => $partner->id,
    ])->assertSessionHasNoErrors();

    $property = Property::query()->sole();
    expect($property->partner?->name)->toBe('Garantme');

    $this->actingAs($member)->get(route('properties.show', $property))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('property.partner.name', 'Garantme')
            ->where('property.partner.uuid', $partner->uuid));

    // Un partenaire inconnu est refusé.
    $this->actingAs($member)
        ->from(route('properties.index'))
        ->patch(route('properties.update', $property), ['street' => 'A', 'partner_id' => 99_999])
        ->assertSessionHasErrors('partner_id');
});

test('adding and editing a property are dedicated pages, addressed by uuid', function (): void {
    $this->get(route('properties.create'))->assertRedirect(route('login'));

    $property = Property::factory()->create(['title' => 'T2 lumineux · 11e']);
    $member = User::factory()->create();

    $this->actingAs($member)
        ->get(route('properties.create'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('properties/edit')
            ->where('property', null)
            ->has('propertyTypes')
            ->has('agents'));

    $this->actingAs($member)
        ->get(route('properties.edit', $property))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('properties/edit')
            ->where('property.uuid', $property->uuid)
            ->where('property.label', 'T2 lumineux · 11e')
            ->has('owners'));

    $this->actingAs($member)->get("/properties/{$property->id}/edit")->assertNotFound();
});

test('only admins delete a property, which removes its visits', function (): void {
    $property = Property::factory()->create();
    Visit::factory()->create(['property_id' => $property->id]);

    $this->actingAs(User::factory()->create())->delete(route('properties.destroy', $property))->assertForbidden();
    $this->actingAs(User::factory()->admin()->create())->delete(route('properties.destroy', $property))->assertRedirect();

    expect(Property::query()->count())->toBe(0)
        ->and(Visit::query()->count())->toBe(0);
});

test('property routes use the uuid and refuse the numeric id', function (): void {
    $property = Property::factory()->create();
    $admin = User::factory()->admin()->create();

    expect(Str::isUuid($property->uuid))->toBeTrue()
        ->and(route('properties.update', $property))->toEndWith('/properties/'.$property->uuid);

    $this->actingAs($admin)->patch('/properties/'.$property->id, ['street' => 'X'])->assertNotFound();
    $this->actingAs($admin)->delete('/properties/'.$property->id)->assertNotFound();
});

test('a property has a detail page with its owner, visits and the form options, addressed by uuid', function (): void {
    $owner = Owner::factory()->create(['first_name' => 'Ali', 'last_name' => 'Bensaïd']);
    $property = Property::factory()->create(['title' => 'T2 lumineux · 11e', 'owner_id' => $owner->id]);
    $lead = Lead::factory()->converted()->create(['first_name' => 'Léa', 'last_name' => 'Durand']);
    Visit::factory()->create(['property_id' => $property->id, 'lead_id' => $lead->id]);

    $this->actingAs(User::factory()->create())
        ->get(route('properties.show', $property))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('properties/show')
            ->where('property.label', 'T2 lumineux · 11e')
            ->where('property.visits_count', 1)
            ->where('owner.name', 'Ali Bensaïd')
            ->has('visits', 1)
            ->where('visits.0.client.name', 'Léa Durand')
            ->has('propertyTypes'));

    $this->actingAs(User::factory()->create())->get("/properties/{$property->id}")->assertNotFound();
});

test('the detail page tells which client dossiers the property is attached to', function (): void {
    $property = Property::factory()->create();
    $client = Lead::factory()->converted()->create(['first_name' => 'Léa', 'last_name' => 'Durand']);
    $other = Property::factory()->create();
    $client->properties()->attach($property->id, ['created_by' => null]);
    Lead::factory()->converted()->create()->properties()->attach($other->id);

    $this->actingAs(User::factory()->create())
        ->get(route('properties.show', $property))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->has('clients', 1)
            ->where('clients.0.uuid', $client->uuid)
            ->where('clients.0.name', 'Léa Durand')
            ->where('clients.0.reference', $client->reference));

    $this->actingAs(User::factory()->create())
        ->get(route('properties.show', Property::factory()->create()))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page->has('clients', 0));
});

test('a modification keeps the floor, the lease type and the charges', function (): void {
    // Les règles de modification étaient une copie incomplète de celles de la création :
    // l'étage, le type de bail et les charges n'étaient pas validés, donc effacés à chaque
    // enregistrement. Elles ne vivent plus qu'à un seul endroit.
    $property = Property::factory()->create(['street' => 'A', 'floor' => PropertyFloor::Third, 'charges_cents' => 12_000]);

    $this->actingAs(User::factory()->create())
        ->patch(route('properties.update', $property), [
            'street' => 'B',
            'floor' => 'above',
            'charges_cents' => 12_000,
            'lease_type' => 'alur',
        ])
        ->assertSessionHasNoErrors();

    $property->refresh();

    expect($property->floor)->toBe(PropertyFloor::Above)
        ->and($property->charges_cents)->toBe(12_000)
        ->and($property->lease_type?->value)->toBe('alur');
});

test('the rent can be stored as charges included, and stays excluded by default', function (): void {
    $member = User::factory()->create();

    $this->actingAs($member)
        ->post(route('properties.store'), ['street' => '9 rue Oberkampf', 'rent_cents' => 150_000, 'charges_cents' => 10_000])
        ->assertSessionHasNoErrors();
    $property = Property::query()->firstOrFail();
    expect($property->charges_included)->toBeFalse();

    $this->actingAs($member)
        ->patch(route('properties.update', $property), ['street' => '9 rue Oberkampf', 'rent_cents' => 150_000, 'charges_cents' => 10_000, 'charges_included' => true])
        ->assertSessionHasNoErrors();
    expect($property->refresh()->charges_included)->toBeTrue();

    $this->actingAs($member)
        ->get(route('properties.show', $property))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page->where('property.charges_included', true));
});

test('a property has an availability status, available by default, changed on update and listed in the form options', function (): void {
    $member = User::factory()->create();

    $this->actingAs($member)->post(route('properties.store'), ['street' => '9 rue Oberkampf'])->assertSessionHasNoErrors();
    $property = Property::query()->firstOrFail();
    expect($property->status)->toBe(PropertyStatus::Available)->and($property->status->isOpen())->toBeTrue();

    $this->actingAs($member)->patch(route('properties.update', $property), ['street' => '9 rue Oberkampf', 'status' => 'unavailable'])->assertSessionHasNoErrors();
    expect($property->refresh()->status)->toBe(PropertyStatus::Unavailable)->and($property->status->isOpen())->toBeFalse();

    $this->actingAs($member)->patch(route('properties.update', $property), ['street' => '9 rue Oberkampf', 'status' => 'nope'])->assertSessionHasErrors('status');

    $this->actingAs($member)
        ->get(route('properties.index'))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('properties.0.status', 'unavailable')
            ->where('properties.0.status_label', 'Non disponible')
            ->has('propertyStatuses', count(PropertyStatus::cases())));
});

test('photos are added when a property is created and kept, added or removed when it is updated', function (): void {
    Storage::fake('public');
    $staff = User::factory()->create();

    $this->actingAs($staff)->post(route('properties.store'), [
        'street' => '12 rue Oberkampf',
        'postal_code' => '75011',
        'city' => 'Paris',
        'photos' => [UploadedFile::fake()->image('salon.jpg'), UploadedFile::fake()->image('cuisine.png')],
    ])->assertSessionHasNoErrors();

    $property = Property::query()->sole();
    expect($property->photos)->toHaveCount(2);
    Storage::disk('public')->assertExists($property->photos[0]);

    [$first, $second] = $property->photos;

    // On garde la première, on en ajoute une : la seconde quitte le disque.
    $this->actingAs($staff)->patch(route('properties.update', $property), [
        'street' => '12 rue Oberkampf',
        'kept_photos' => [$first],
        'photos' => [UploadedFile::fake()->image('chambre.webp')],
    ])->assertSessionHasNoErrors();

    $photos = $property->refresh()->photos;
    expect($photos)->toHaveCount(2)
        ->and($photos[0])->toBe($first);
    Storage::disk('public')->assertMissing($second);

    // Sans `kept_photos`, les photos existantes ne bougent pas.
    $this->actingAs($staff)->patch(route('properties.update', $property), ['street' => '12 rue Oberkampf'])
        ->assertSessionHasNoErrors();
    expect($property->refresh()->photos)->toHaveCount(2);

    // Un fichier qui n'est pas une image est refusé.
    $this->actingAs($staff)->from(route('properties.edit', $property))
        ->patch(route('properties.update', $property), [
            'street' => '12 rue Oberkampf',
            'photos' => [UploadedFile::fake()->create('plan.pdf', 10, 'application/pdf')],
        ])
        ->assertSessionHasErrors('photos.0');

    // La page de modification renvoie les chemins, pour dire lesquels on garde.
    $this->actingAs($staff)->get(route('properties.edit', $property))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->has('property.photo_paths', 2)
            ->has('property.photos', 2));
});

test('a property can be exported as a PDF, in the same style as the other documents', function (): void {
    Storage::fake('public');
    Http::fake(['docraptor.com/*' => Http::response('%PDF-1.4 bien', 200, ['Content-Type' => 'application/pdf'])]);
    config()->set('services.docraptor.key', 'doc-key');

    $staff = User::factory()->create();
    $agency = Agency::factory()->create(['name' => 'Agence du Marais']);
    $agent = Agent::factory()->forAgency($agency)->create(['first_name' => 'Julie', 'last_name' => 'Roux', 'phone' => '+33 6 11 22 33 44']);
    $owner = Owner::factory()->create(['first_name' => 'Zoé', 'last_name' => 'Martin']);
    $property = Property::factory()->create([
        'title' => 'T2 lumineux · 11e',
        'street' => '12 rue Oberkampf',
        'postal_code' => '75011',
        'city' => 'Paris',
        'rent_cents' => 150_000,
        'charges_cents' => 12_000,
        'agent_id' => $agent->id,
        'owner_id' => $owner->id,
        'notes' => 'Ascenseur, cave.',
    ]);

    // Hors connexion, la fiche PDF n'est pas accessible.
    $this->get(route('properties.pdf', $property))->assertRedirect(route('login'));

    $response = $this->actingAs($staff)->get(route('properties.pdf', $property));

    $response->assertOk()
        ->assertHeader('Content-Type', 'application/pdf')
        ->assertHeader('Content-Disposition', 'attachment; filename="bien-t2-lumineux-11e.pdf"');

    // Le HTML envoyé à DocRaptor porte la charte et les données du bien.
    Http::assertSent(function (Request $request): bool {
        $html = (string) ($request['document_content'] ?? '');

        return str_contains($html, 'Fiche du bien')
            && str_contains($html, 'T2 lumineux · 11e')
            && str_contains($html, '12 rue Oberkampf, 75011 Paris')
            && str_contains($html, '1 500,00 €')
            && str_contains($html, 'Julie Roux')
            && str_contains($html, 'Agence du Marais')
            && str_contains($html, 'Zoé Martin')
            && str_contains($html, 'Ascenseur, cave.');
    });
});

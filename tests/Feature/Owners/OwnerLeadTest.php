<?php

declare(strict_types=1);

use App\Enums\LeadStatus;
use App\Enums\LeaseType;
use App\Enums\OwnerPropertyType;
use App\Enums\PropertyAmenity;
use App\Enums\WebsiteHelpType;
use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\LeadProperty;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Inertia\Testing\AssertableInertia;

beforeEach(fn () => Event::fake([DashboardUpdated::class]));

function ownerLeadPayload(array $overrides = []): array
{
    return [
        'first_name' => 'zoé',
        'last_name' => 'martin',
        'email' => 'zoe@example.com',
        'phone' => '+33 6 12 34 56 78',
        'language' => 'fr',
        'source' => 'phone',
        'property' => [
            'address' => '12 rue de Rivoli, 75004 Paris',
            'property_type' => 't2',
            'property_status' => 'available',
            'bedrooms' => 1,
            'bathrooms' => 1,
            'surface' => 45,
            'floor' => 3,
            'building_floors' => 6,
            'furnishing' => 'furnished',
            'orientations' => ['south'],
            'lease_types' => ['alur', 'mobility'],
            'rent_cents' => 150_000,
            'charges_cents' => 12_000,
            'deposit_cents' => 150_000,
            'amenities' => ['elevator', 'balcony'],
            'note' => 'Visites possibles le samedi.',
        ],
        ...$overrides,
    ];
}

test('the owner converting machine page exposes the property options', function (): void {
    $this->get(route('owners.leads.create'))->assertRedirect(route('login'));

    $this->actingAs(User::factory()->create())
        ->get(route('owners.leads.create'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('owners/create')
            ->has('languages')
            ->has('sources')
            ->has('propertyTypes', 9)
            ->has('propertyStatuses', 3)
            ->has('leaseTypes', 5)
            ->has('orientations', 4)
            ->has('amenities', 24)
            ->where('furnishingOptions.1.label', 'Vide')
            ->missing('lead'));
});

test('an owner lead is created with its property in the owner list', function (): void {
    $member = User::factory()->create();

    $this->actingAs($member)
        ->post(route('owners.leads.store'), ownerLeadPayload(['assigned_to' => $member->id]))
        ->assertRedirect(route('owners.leads'));

    $lead = Lead::query()->with('property')->firstOrFail();

    expect($lead->first_name)->toBe('Zoé')
        ->and($lead->help_type)->toBe(WebsiteHelpType::RentalManagement)
        ->and($lead->status)->toBe(LeadStatus::Todo)
        ->and($lead->assigned_to)->toBe($member->id)
        ->and($lead->created_by)->toBe($member->id)
        ->and($lead->property)->not->toBeNull()
        ->and($lead->property?->property_type)->toBe(OwnerPropertyType::T2)
        ->and($lead->property?->surface)->toBe(45)
        ->and($lead->property?->rent_cents)->toBe(150_000)
        ->and($lead->property?->lease_types?->all())->toBe([LeaseType::Alur, LeaseType::Mobility])
        ->and($lead->property?->amenities?->all())->toBe([PropertyAmenity::Elevator, PropertyAmenity::Balcony])
        ->and($lead->property?->note)->toBe('Visites possibles le samedi.');

    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->resource === 'leads' && str_contains((string) $event->message, 'lead propriétaire Zoé Martin'));
});

test('the contact alone is enough and an e-mail or a phone is required', function (): void {
    $member = User::factory()->create();

    $this->actingAs($member)
        ->post(route('owners.leads.store'), ['first_name' => 'Ali', 'last_name' => 'Bensaïd', 'phone' => '+33 6 00 00 00 00', 'property' => ['address' => '', 'orientations' => []]])
        ->assertRedirect(route('owners.leads'));

    expect(Lead::query()->count())->toBe(1)
        ->and(LeadProperty::query()->count())->toBe(0);

    $this->actingAs($member)
        ->from(route('owners.leads.create'))
        ->post(route('owners.leads.store'), ['first_name' => 'Sans', 'last_name' => 'Contact'])
        ->assertSessionHasErrors(['email' => 'Indiquez au moins un e-mail ou un téléphone.']);

    $this->actingAs($member)
        ->from(route('owners.leads.create'))
        ->post(route('owners.leads.store'), ownerLeadPayload(['property' => ['bedrooms' => 9, 'property_type' => 'castle', 'furnishing' => 'either']]))
        ->assertSessionHasErrors(['property.bedrooms', 'property.property_type', 'property.furnishing']);
});

test('editing is reserved to owner leads and the form is prefilled', function (): void {
    $member = User::factory()->create();
    $tenant = Lead::factory()->create();
    $owner = Lead::factory()->rentalManagement()->create(['first_name' => 'Zoé', 'last_name' => 'Martin', 'email' => null]);
    LeadProperty::factory()->create(['lead_id' => $owner->id, 'property_type' => OwnerPropertyType::Loft, 'orientations' => [], 'amenities' => null]);

    $this->actingAs($member)->get(route('owners.leads.edit', $tenant))->assertNotFound();
    $this->actingAs($member)->get('/owners/leads/'.$owner->id.'/edit')->assertNotFound();

    $this->actingAs($member)
        ->get(route('owners.leads.edit', $owner))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('owners/create')
            ->where('lead.uuid', $owner->uuid)
            ->where('lead.name', 'Zoé Martin')
            ->where('lead.email', '')
            ->where('lead.property.property_type', 'loft')
            ->where('lead.property.orientations', [])
            ->where('lead.property.amenities', []));
});

test('updating an owner lead changes the contact and the property, or removes an emptied property', function (): void {
    $member = User::factory()->create();
    $lead = Lead::factory()->rentalManagement()->create(['score' => 4]);
    LeadProperty::factory()->create(['lead_id' => $lead->id, 'surface' => 20]);

    $this->actingAs($member)
        ->put(route('owners.leads.update', $lead), ownerLeadPayload(['first_name' => 'nour', 'property' => ['surface' => 80, 'property_type' => 'house']]))
        ->assertRedirect(route('leads.show', $lead));

    $lead->refresh()->load('property');

    expect($lead->first_name)->toBe('Nour')
        ->and($lead->score)->toBe(4)
        ->and($lead->help_type)->toBe(WebsiteHelpType::RentalManagement)
        ->and($lead->property?->surface)->toBe(80)
        ->and($lead->property?->property_type)->toBe(OwnerPropertyType::House)
        ->and($lead->property?->address)->toBeNull();

    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => str_contains((string) $event->message, 'a modifié le lead propriétaire Nour Martin'));

    $this->actingAs($member)
        ->put(route('owners.leads.update', $lead), ['first_name' => 'Nour', 'last_name' => 'Martin', 'phone' => '+33 6 00 00 00 00'])
        ->assertRedirect(route('leads.show', $lead));

    expect(LeadProperty::query()->where('lead_id', $lead->id)->exists())->toBeFalse();
});

test('the lead page exposes the property with its labels, and null for tenants', function (): void {
    $member = User::factory()->create();
    $owner = Lead::factory()->rentalManagement()->create();
    LeadProperty::factory()->create([
        'lead_id' => $owner->id,
        'property_type' => OwnerPropertyType::T3,
        'furnishing' => 'unfurnished',
        'orientations' => ['north', 'east'],
        'lease_types' => ['civil_code'],
        'amenities' => ['pool'],
    ]);
    $tenant = Lead::factory()->create();

    $this->actingAs($member)
        ->get(route('leads.show', $owner))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('property.property_type_label', 'T3')
            ->where('property.furnishing_label', 'Vide')
            ->where('property.orientation_labels', ['Nord', 'Est'])
            ->where('property.lease_type_labels', ['Code civil'])
            ->where('property.amenity_labels', ['Piscine']));

    $this->actingAs($member)
        ->get(route('leads.show', $tenant))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page->where('property', null));
});

test('deleting a lead removes its property', function (): void {
    $lead = Lead::factory()->rentalManagement()->create();
    LeadProperty::factory()->create(['lead_id' => $lead->id]);

    $lead->delete();

    expect(LeadProperty::query()->count())->toBe(0);
});

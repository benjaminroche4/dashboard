<?php

declare(strict_types=1);

use App\Enums\LeadStatus;
use App\Enums\OwnerStatus;
use App\Enums\WebsiteHelpType;
use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\Owner;
use App\Models\Property;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Inertia\Testing\AssertableInertia;

beforeEach(fn () => Event::fake([DashboardUpdated::class]));

test('the owners page lists every owner with status and lead, sorted by name, plus the statuses', function (): void {
    $this->get(route('owners.index'))->assertRedirect(route('login'));

    $author = User::factory()->create(['name' => 'Admin']);
    $lead = Lead::factory()->create(['reference' => 'LD-0042']);
    Owner::factory()->status(OwnerStatus::Interested)->create(['first_name' => 'Zoé', 'last_name' => 'Martin', 'lead_id' => $lead->id, 'created_by' => $author->id]);
    Owner::factory()->create(['first_name' => 'Ali', 'last_name' => 'Bensaïd']);

    $this->actingAs($author)
        ->get(route('owners.index'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('owners/index')
            ->has('owners', 2)
            ->where('owners.0.name', 'Ali Bensaïd')
            ->where('owners.0.status_label', 'À contacter')
            ->where('owners.0.lead', null)
            ->where('owners.1.lead.reference', 'LD-0042')
            ->where('owners.1.creator', 'Admin')
            ->has('statuses', count(OwnerStatus::cases())));
});

test('any member creates, updates and the payload needs a name and a way to reach the owner', function (): void {
    $member = User::factory()->create();

    $this->actingAs($member)
        ->from(route('owners.index'))
        ->post(route('owners.store'), ['first_name' => 'jean', 'last_name' => 'DUPONT', 'email' => '', 'phone' => ''])
        ->assertSessionHasErrors(['email', 'phone']);

    $this->actingAs($member)
        ->from(route('owners.index'))
        ->post(route('owners.store'), [
            'first_name' => 'jean-pierre',
            'last_name' => 'dupont',
            'phone' => '+33 6 12 34 56 78',
            'street' => '5 rue de Bretagne',
            'postal_code' => '75003',
            'city' => 'Paris',
            'property_count' => 3,
        ])
        ->assertRedirect(route('owners.index'))
        ->assertSessionHasNoErrors();

    $owner = Owner::query()->firstOrFail();
    expect($owner->fullName())->toBe('Jean-Pierre Dupont')
        ->and($owner->status)->toBe(OwnerStatus::ToContact)
        ->and($owner->property_count)->toBe(3)
        ->and($owner->created_by)->toBe($member->id);

    $this->actingAs($member)
        ->patch(route('owners.update', $owner), ['first_name' => 'Jean-Pierre', 'last_name' => 'Dupont', 'phone' => '+33 6 12 34 56 78', 'status' => 'contacted'])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect($owner->fresh()->status)->toBe(OwnerStatus::Contacted)
        ->and($owner->fresh()->last_contacted_at)->not->toBeNull();

});

test('converting an owner creates a rental-management lead assigned to the member and links it', function (): void {
    $member = User::factory()->create();
    $owner = Owner::factory()->create(['first_name' => 'Zoé', 'last_name' => 'Martin', 'email' => 'zoe@example.com', 'property_count' => 2, 'notes' => 'Deux studios dans le 11e.']);

    $response = $this->actingAs($member)->post(route('owners.convert', $owner));

    $lead = Lead::query()->sole();
    $response->assertRedirect(route('leads.show', $lead));

    expect($lead->fullName())->toBe('Zoé Martin')
        ->and($lead->help_type)->toBe(WebsiteHelpType::RentalManagement)
        ->and($lead->status)->toBe(LeadStatus::Todo)
        ->and($lead->assigned_to)->toBe($member->id)
        ->and($lead->source_note)->toBe('Propriétaire prospecté · 2 bien(s)')
        ->and($lead->message)->toBe('Deux studios dans le 11e.')
        ->and($owner->fresh()->lead_id)->toBe($lead->id)
        ->and($owner->fresh()->status)->toBe(OwnerStatus::Interested);

    $this->actingAs($member)->from(route('owners.index'))->post(route('owners.convert', $owner))->assertSessionHasErrors('lead');
    expect(Lead::count())->toBe(1);
});

test('the owner leads page lists only rental-management leads, newest first', function (): void {
    Lead::factory()->create(['first_name' => 'Locataire', 'help_type' => WebsiteHelpType::HousingSearch]);
    Lead::factory()->create(['first_name' => 'Sans', 'help_type' => null]);
    Lead::factory()->create(['first_name' => 'Ancien', 'help_type' => WebsiteHelpType::RentalManagement, 'created_at' => now()->subDay()]);
    Lead::factory()->create(['first_name' => 'Récent', 'help_type' => WebsiteHelpType::RentalManagement]);

    $this->actingAs(User::factory()->create())
        ->get(route('owners.leads'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('owners/leads')
            ->has('leads', 2)
            ->where('leads.0.name', fn (string $name): bool => str_starts_with($name, 'Récent'))
            ->where('leads.1.name', fn (string $name): bool => str_starts_with($name, 'Ancien'))
            ->where('leads.0.status_label', 'À traiter')
            ->where('archived.loaded', false)
            ->where('archived.count', 0)
            ->has('leads.0.author')
            ->has('leads.0.districts')
            ->has('statuses', 5)
            ->where('statuses.2.label', 'En signature')
            ->has('offers', 2)
            ->has('lossReasons')
            ->where('realtimeOnly', ['leads']));
});

test('owner leads carry the owner status labels', function (): void {
    Lead::factory()->create(['help_type' => WebsiteHelpType::RentalManagement, 'status' => LeadStatus::QuoteSent]);

    $this->actingAs(User::factory()->create())
        ->get(route('owners.leads'))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('leads.0.status', 'quote_sent')
            ->where('leads.0.status_label', 'En signature'));
});

test('duplicates are found by e-mail or phone ending, and only admins delete', function (): void {
    $owner = Owner::factory()->create(['email' => 'zoe@example.com', 'phone' => '+33 6 11 22 33 44']);
    $member = User::factory()->create();

    $this->actingAs($member)->getJson(route('owners.duplicates', ['email' => 'ZOE@example.com']))->assertJsonCount(1)->assertJsonPath('0.uuid', $owner->uuid);
    $this->actingAs($member)->getJson(route('owners.duplicates', ['phone' => '06 11 22 33 44', 'except' => $owner->id]))->assertJsonCount(0);

    $this->actingAs($member)->delete(route('owners.destroy', $owner))->assertForbidden();
    $this->actingAs(User::factory()->admin()->create())->delete(route('owners.destroy', $owner))->assertRedirect();
    expect(Owner::count())->toBe(0);
});

test('an owner has a detail page with its lead and properties, addressed by uuid', function (): void {
    $lead = Lead::factory()->create(['reference' => 'LD-0042']);
    $owner = Owner::factory()->create(['first_name' => 'Zoé', 'last_name' => 'Martin', 'lead_id' => $lead->id]);
    Property::factory()->create(['title' => 'Studio · 5e', 'owner_id' => $owner->id]);
    Property::factory()->create(['title' => 'Ailleurs']);

    $this->actingAs(User::factory()->create())
        ->get(route('owners.show', $owner))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('owners/show')
            ->where('owner.name', 'Zoé Martin')
            ->where('owner.lead.reference', 'LD-0042')
            ->has('properties', 1)
            ->where('properties.0.label', 'Studio · 5e')
            ->has('statuses', count(OwnerStatus::cases())));

    $this->actingAs(User::factory()->create())->get("/owners/{$owner->id}")->assertNotFound();
});

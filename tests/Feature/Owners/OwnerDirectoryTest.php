<?php

declare(strict_types=1);

use App\Enums\LeadStatus;
use App\Enums\OwnerKind;
use App\Enums\WebsiteHelpType;
use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\Owner;
use App\Models\Property;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Inertia\Testing\AssertableInertia;

beforeEach(fn () => Event::fake([DashboardUpdated::class]));

test('the directory is searched, filtered by kind and by holding, and paginated by the server', function (): void {
    $member = User::factory()->create();
    $withProperty = Owner::factory()->create(['first_name' => 'Ali', 'last_name' => 'Bensaïd', 'city' => 'Lyon']);
    Property::factory()->create(['owner_id' => $withProperty->id]);
    Owner::factory()->create(['first_name' => 'Zoé', 'last_name' => 'Martin']);
    Owner::factory()->company()->create(['company' => 'SCI du Marais']);

    // Recherche : le nom, la société, la ville.
    $this->actingAs($member)
        ->get(route('owners.index', ['q' => 'marais']))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->has('owners', 1)
            ->where('owners.0.name', 'SCI du Marais')
            ->where('pagination.total', 1));

    $this->actingAs($member)
        ->get(route('owners.index', ['q' => 'lyon']))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page->has('owners', 1)->where('owners.0.name', 'Ali Bensaïd'));

    // Filtre par type : les sociétés seules.
    $this->actingAs($member)
        ->get(route('owners.index', ['kind' => ['company']]))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->has('owners', 1)
            ->where('owners.0.kind', 'company')
            ->where('filters.kind', ['company']));

    // Filtre « sans bien rattaché » : deux des trois.
    $this->actingAs($member)
        ->get(route('owners.index', ['holding' => ['without']]))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page->has('owners', 2));

    // Les deux cases cochées reviennent à ne pas filtrer.
    $this->actingAs($member)
        ->get(route('owners.index', ['holding' => ['with', 'without']]))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page->has('owners', 3));

    // Un tri inconnu est refusé plutôt qu'appliqué au hasard.
    $this->actingAs($member)
        ->get(route('owners.index', ['sort' => 'notes']))
        ->assertSessionHasErrors('sort');
});

test('the directory sorts by the last exchange, never-contacted owners first', function (): void {
    $member = User::factory()->create();
    Owner::factory()->create(['first_name' => 'Ali', 'last_name' => 'Bensaïd', 'last_contacted_at' => now()->subDays(3)]);
    Owner::factory()->create(['first_name' => 'Zoé', 'last_name' => 'Martin', 'last_contacted_at' => null]);

    $this->actingAs($member)
        ->get(route('owners.index', ['sort' => 'last_contacted_at', 'dir' => 'asc']))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('owners.0.name', 'Zoé Martin')
            ->where('owners.1.name', 'Ali Bensaïd'));
});

test('a member notes an exchange with an owner', function (): void {
    $member = User::factory()->create();
    $owner = Owner::factory()->create();

    $this->actingAs($member)
        ->from(route('owners.show', $owner))
        ->post(route('owners.contact', $owner))
        ->assertRedirect(route('owners.show', $owner));

    expect($owner->refresh()->last_contacted_at)->not->toBeNull();
    Event::assertDispatched(DashboardUpdated::class);
});

test('owners are imported from a spreadsheet, already known contacts are skipped', function (): void {
    $member = User::factory()->create();
    Owner::factory()->create(['email' => 'deja@example.com']);

    $this->actingAs($member)
        ->from(route('owners.index'))
        ->post(route('owners.import'), ['rows' => [
            ['first_name' => 'zoé', 'last_name' => 'martin', 'email' => 'zoe@example.com', 'phone' => '', 'company' => '', 'street' => '8 rue de Rivoli', 'postal_code' => '75004', 'city' => 'Paris'],
            ['first_name' => '', 'last_name' => '', 'company' => 'SCI du Marais', 'email' => '', 'phone' => '+33 6 12 34 56 78'],
            ['first_name' => 'Autre', 'last_name' => 'Personne', 'email' => 'DEJA@example.com'],
        ]])
        ->assertRedirect(route('owners.index'));

    expect(Owner::query()->count())->toBe(3);

    $person = Owner::query()->where('email', 'zoe@example.com')->sole();
    // Les noms sont capitalisés, comme partout ailleurs.
    expect($person->fullName())->toBe('Zoé Martin')
        ->and($person->kind)->toBe(OwnerKind::Individual)
        ->and($person->city)->toBe('Paris');

    // Une ligne sans personne nommée est une société.
    expect(Owner::query()->where('company', 'SCI du Marais')->sole()->kind)->toBe(OwnerKind::Company);
});

test('an import row needs a name and a way to reach the owner', function (): void {
    $member = User::factory()->create();

    $this->actingAs($member)
        ->from(route('owners.index'))
        ->post(route('owners.import'), ['rows' => [['first_name' => 'Zoé', 'last_name' => '', 'company' => '', 'email' => 'zoe@example.com']]])
        ->assertSessionHasErrors('rows.0.last_name');

    $this->actingAs($member)
        ->from(route('owners.index'))
        ->post(route('owners.import'), ['rows' => [['last_name' => 'Martin', 'email' => '', 'phone' => '']]])
        ->assertSessionHasErrors('rows.0.email');

    expect(Owner::query()->count())->toBe(0);
});

test('an owner lead joins the directory once, and its page links back to it', function (): void {
    $member = User::factory()->create();
    $lead = Lead::factory()->create([
        'first_name' => 'Zoé',
        'last_name' => 'Martin',
        'company' => 'SCI du Marais',
        'email' => 'zoe@example.com',
        'help_type' => WebsiteHelpType::RentalManagement,
        'status' => LeadStatus::InProgress,
    ]);

    $this->actingAs($member)
        ->post(route('owners.from-lead', $lead))
        ->assertRedirect();

    $owner = Owner::query()->sole();
    expect($owner->lead_id)->toBe($lead->id)
        // Une raison sociale fait une société.
        ->and($owner->kind)->toBe(OwnerKind::Company)
        ->and($owner->fullName())->toBe('SCI du Marais')
        ->and($owner->email)->toBe('zoe@example.com')
        // Le rattachement est noté sur le lead.
        ->and($lead->notes()->count())->toBe(1);

    // Un second appel ne crée pas de doublon.
    $this->actingAs($member)->post(route('owners.from-lead', $lead))->assertRedirect();
    expect(Owner::query()->count())->toBe(1);

    // La fiche du propriétaire rappelle le lead d'où elle vient.
    $this->actingAs($member)
        ->get(route('owners.show', $owner))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('owner.lead.uuid', $lead->uuid)
            ->where('owner.lead.name', 'Zoé Martin'));

    // Et la fiche du lead sait qu'elle existe déjà.
    $this->actingAs($member)
        ->get(route('leads.show', $lead))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page->where('directoryOwner.uuid', $owner->uuid));
});

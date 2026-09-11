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
use Illuminate\Support\Facades\Route;
use Inertia\Testing\AssertableInertia;

beforeEach(fn () => Event::fake([DashboardUpdated::class]));

test('the owners directory lists everyone with their kind and how many properties they hold', function (): void {
    $this->get(route('owners.index'))->assertRedirect(route('login'));

    $author = User::factory()->create(['name' => 'Admin']);
    $company = Owner::factory()->company()->create(['company' => 'SCI du Marais', 'created_by' => $author->id]);
    $owner = Owner::factory()->create(['first_name' => 'Ali', 'last_name' => 'Bensaïd']);
    Property::factory()->count(2)->create(['owner_id' => $company->id]);

    $this->actingAs($author)
        ->get(route('owners.index'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('owners/index')
            ->has('owners', 2)
            // Trié sur le nom affiché : la personne, puis la raison sociale.
            ->where('owners.0.name', 'Ali Bensaïd')
            ->where('owners.0.kind_label', 'Particulier')
            ->where('owners.0.properties_count', 0)
            // Un propriétaire peut détenir plusieurs biens : on compte les vrais.
            ->where('owners.1.name', 'SCI du Marais')
            ->where('owners.1.kind', 'company')
            ->where('owners.1.kind_label', 'Société ou agence')
            ->where('owners.1.properties_count', 2)
            ->where('owners.1.creator', 'Admin')
            ->has('kinds', 2)
            // L'annuaire n'est pas un pipeline : aucun statut de prospection.
            ->missing('statuses')
            ->missing('owners.0.status')
            // Mais il dit quand on s'est parlé pour la dernière fois.
            ->where('owners.0.last_contacted_at', null)
            ->has('pagination')
            ->where('pagination.total', 2)
            ->where('holdingCounts.with', 1)
            ->where('holdingCounts.without', 1)
            ->where('propertiesCount', 2));

    expect($owner->kind)->toBe(OwnerKind::Individual);
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
        ])
        ->assertRedirect(route('owners.index'))
        ->assertSessionHasNoErrors();

    $owner = Owner::query()->firstOrFail();
    expect($owner->fullName())->toBe('Jean-Pierre Dupont')
        ->and($owner->kind)->toBe(OwnerKind::Individual)
        ->and($owner->created_by)->toBe($member->id);

    // Une société est nommée par sa raison sociale, l'interlocuteur est facultatif.
    $this->actingAs($member)
        ->from(route('owners.index'))
        ->post(route('owners.store'), ['kind' => 'company', 'phone' => '+33 1 22 33 44 55'])
        ->assertSessionHasErrors('company');

    $this->actingAs($member)
        ->post(route('owners.store'), ['kind' => 'company', 'company' => 'SCI du Marais', 'phone' => '+33 1 22 33 44 55'])
        ->assertSessionHasNoErrors();

    $sci = Owner::query()->where('company', 'SCI du Marais')->sole();
    expect($sci->fullName())->toBe('SCI du Marais')
        ->and($sci->contactName())->toBeNull();
});

test('the directory offers no conversion to a lead: prospecting lives in the leads pages', function (): void {
    $owner = Owner::factory()->create();

    expect(Route::has('owners.convert'))->toBeFalse();
    expect(fn (): string => route('owners.convert', $owner))->toThrow(Exception::class);
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

test('an owner has a detail page with the properties held, addressed by uuid', function (): void {
    $owner = Owner::factory()->create(['first_name' => 'Zoé', 'last_name' => 'Martin']);
    Property::factory()->create(['title' => 'Studio · 5e', 'owner_id' => $owner->id]);
    Property::factory()->create(['title' => 'Loft · 11e', 'owner_id' => $owner->id]);
    Property::factory()->create(['title' => 'Ailleurs']);

    $this->actingAs(User::factory()->create())
        ->get(route('owners.show', $owner))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('owners/show')
            ->where('owner.name', 'Zoé Martin')
            ->where('owner.properties_count', 2)
            ->has('properties', 2)
            ->has('kinds', 2)
            // Le parc en trois chiffres, et aucun lead d'origine ici.
            ->where('stats.properties', 2)
            ->where('owner.lead', null));

    $this->actingAs(User::factory()->create())->get("/owners/{$owner->id}")->assertNotFound();
});

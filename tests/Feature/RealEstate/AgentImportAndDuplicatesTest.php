<?php

declare(strict_types=1);

use App\Enums\AgentPosition;
use App\Events\DashboardUpdated;
use App\Models\Agency;
use App\Models\Agent;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Inertia\Testing\AssertableInertia;

beforeEach(function (): void {
    Event::fake([DashboardUpdated::class]);
});

test('agents pasted from a spreadsheet are imported, agencies found or created, known contacts skipped', function (): void {
    $marais = Agency::factory()->create(['name' => 'Agence du Marais']);
    Agent::factory()->create(['email' => 'deja@example.com']);
    $member = User::factory()->create();

    $this->actingAs($member)
        ->from(route('agents.index'))
        ->post(route('agents.import'), ['rows' => [
            ['first_name' => 'zoé', 'last_name' => 'martin', 'agency' => 'agence du marais', 'position' => 'Négociatrice', 'email' => 'zoe@example.com', 'phone' => '+33 6 11 22 33 44'],
            ['first_name' => 'Ali', 'last_name' => 'Bensaïd', 'agency' => 'Bureau Paris Ouest', 'email' => '', 'phone' => '06 55 66 77 88'],
            ['first_name' => 'Déjà', 'last_name' => 'Là', 'agency' => '', 'email' => 'DEJA@example.com', 'phone' => ''],
        ]])
        ->assertRedirect(route('agents.index'))
        ->assertSessionHasNoErrors();

    expect(Agent::query()->count())->toBe(3)
        ->and(Agency::query()->count())->toBe(2)
        ->and(Agent::query()->where('email', 'zoe@example.com')->firstOrFail())
        ->agency_id->toBe($marais->id)
        ->first_name->toBe('Zoé')
        ->position->toBe(AgentPosition::Negotiator)
        ->created_by->toBe($member->id)
        ->and(Agency::query()->where('name', 'Bureau Paris Ouest')->firstOrFail()->agents()->count())->toBe(1);

    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->resource === 'agents' && str_contains((string) $event->message, '2 agent(s)'));
});

test('the import payload is validated', function (): void {
    $this->actingAs(User::factory()->create())
        ->post(route('agents.import'), ['rows' => [['first_name' => 'X', 'last_name' => '', 'email' => 'nope']]])
        ->assertSessionHasErrors(['rows.0.last_name', 'rows.0.email']);
});

test('duplicate lookups find agents and agencies by e-mail or phone ending, excluding the edited one', function (): void {
    $agency = Agency::factory()->create(['name' => 'Agence du Marais', 'email' => 'contact@marais.example', 'phone' => '+33 1 42 00 11 22']);
    $agent = Agent::factory()->forAgency($agency)->create(['first_name' => 'Zoé', 'last_name' => 'Martin', 'email' => 'zoe@marais.example', 'phone' => '+33 6 12 34 56 78']);
    $user = User::factory()->create();

    $this->actingAs($user)
        ->getJson(route('agents.duplicates', ['email' => 'ZOE@marais.example']))
        ->assertOk()
        ->assertJsonCount(1)
        ->assertJsonPath('0.name', 'Zoé Martin')
        ->assertJsonPath('0.agency', 'Agence du Marais');

    $this->actingAs($user)
        ->getJson(route('agents.duplicates', ['phone' => '0612345678']))
        ->assertJsonCount(1);

    $this->actingAs($user)
        ->getJson(route('agents.duplicates', ['phone' => '0612345678', 'except' => $agent->id]))
        ->assertJsonCount(0);

    $this->actingAs($user)
        ->getJson(route('agents.duplicates', ['email' => 'x', 'phone' => '06']))
        ->assertJsonCount(0);

    $this->actingAs($user)
        ->getJson(route('agencies.duplicates', ['phone' => '01 42 00 11 22']))
        ->assertJsonCount(1)
        ->assertJsonPath('0.name', 'Agence du Marais');
});

test('the lists expose the author with avatar, the agency agents and the agent leads', function (): void {
    $author = User::factory()->create(['name' => 'Admin']);
    $agency = Agency::factory()->create(['created_by' => $author->id]);
    $agent = Agent::factory()->forAgency($agency)->create(['created_by' => $author->id, 'first_name' => 'Zoé', 'last_name' => 'Martin']);
    Lead::factory()->create(['agent_id' => $agent->id, 'first_name' => 'Léa', 'last_name' => 'Durand']);

    $this->actingAs($author)
        ->get(route('agencies.index'))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('agencies.0.creator', 'Admin')
            ->where('agencies.0.agents.0.name', 'Zoé Martin'));

    $this->actingAs($author)
        ->get(route('agents.index'))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('agents.0.creator', 'Admin')
            ->where('agents.0.leads.0.name', 'Léa Durand'));
});

test('agencies are imported from a spreadsheet paste, known ones ignored', function (): void {
    Event::fake([DashboardUpdated::class]);
    $member = User::factory()->create();
    Agency::factory()->create(['name' => 'Agence du Marais']);
    Agency::factory()->create(['name' => 'Autre', 'email' => 'contact@nord.fr']);

    $this->actingAs($member)
        ->from(route('agencies.index'))
        ->post(route('agencies.import'), ['rows' => [
            ['name' => 'Century 21 Bastille', 'email' => 'bastille@c21.fr', 'phone' => '+33 1 43 00 00 00', 'city' => 'Paris'],
            // Déjà connue par son nom, quelle que soit la casse.
            ['name' => 'AGENCE DU MARAIS', 'email' => '', 'phone' => '', 'city' => ''],
            // Déjà connue par son e-mail.
            ['name' => 'Nord Immobilier', 'email' => 'contact@nord.fr', 'phone' => '', 'city' => 'Lille'],
        ]])
        ->assertRedirect(route('agencies.index'))
        ->assertSessionHasNoErrors();

    expect(Agency::query()->count())->toBe(3)
        ->and(Agency::query()->where('name', 'Century 21 Bastille')->first()?->city)->toBe('Paris')
        ->and(Agency::query()->where('name', 'Century 21 Bastille')->first()?->created_by)->toBe($member->id);

    Event::assertDispatched(fn (DashboardUpdated $event): bool => $event->resource === 'agencies'
        && $event->message === 'a importé 1 agence(s)');

    // Le nom est obligatoire.
    $this->actingAs($member)
        ->from(route('agencies.index'))
        ->post(route('agencies.import'), ['rows' => [['name' => '', 'email' => 'x@example.com']]])
        ->assertSessionHasErrors('rows.0.name');
});

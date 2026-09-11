<?php

declare(strict_types=1);

use App\Actions\Activity\RecordActivity;
use App\Events\DashboardUpdated;
use App\Mail\DirectoryWelcome;
use App\Models\Activity;
use App\Models\Agency;
use App\Models\Agent;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Mail;
use Inertia\Testing\AssertableInertia;

beforeEach(function (): void {
    Event::fake([DashboardUpdated::class]);
});

test('the agencies page lists every agency with its agent count, sorted by name', function (): void {
    $b = Agency::factory()->create(['name' => 'Bureau Paris Ouest']);
    $a = Agency::factory()->create(['name' => 'Agence du Marais']);
    Agent::factory()->count(2)->forAgency($a)->create();

    $this->actingAs(User::factory()->create())
        ->get(route('agencies.index'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('real-estate/agencies')
            ->has('agencies', 2)
            ->where('agencies.0.id', $a->id)
            ->where('agencies.0.agents_count', 2)
            ->where('agencies.1.id', $b->id)
            ->where('agencies.1.agents_count', 0));
});

test('the pages are only available once logged in', function (): void {
    $this->get(route('agencies.index'))->assertRedirect(route('login'));
    $this->get(route('agents.index'))->assertRedirect(route('login'));
});

test('any member creates and updates an agency, blanks become null and the author is kept', function (): void {
    $member = User::factory()->create();

    $this->actingAs($member)
        ->from(route('agencies.index'))
        ->post(route('agencies.store'), [
            'name' => '  Agence du Marais ',
            'street' => '12 rue de Turenne',
            'postal_code' => '75003',
            'city' => 'Paris',
            'phone' => '',
            'email' => 'contact@marais.example',
            'website' => 'https://marais.example',
            'notes' => '   ',
        ])
        ->assertRedirect(route('agencies.index'))
        ->assertSessionHasNoErrors();

    $agency = Agency::query()->firstOrFail();

    expect($agency->name)->toBe('Agence du Marais')
        ->and($agency->phone)->toBeNull()
        ->and($agency->notes)->toBeNull()
        ->and($agency->created_by)->toBe($member->id);

    $this->actingAs($member)
        ->patch(route('agencies.update', $agency), ['name' => 'Agence du Marais & Co', 'website' => 'pas une url'])
        ->assertSessionHasErrors(['website']);

    $this->actingAs($member)
        ->patch(route('agencies.update', $agency), ['name' => 'Agence du Marais & Co', 'email' => null])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect($agency->refresh()->name)->toBe('Agence du Marais & Co')
        ->and($agency->email)->toBeNull();

    Event::assertDispatched(DashboardUpdated::class, 2);
});

test('only admins delete an agency and its agents are kept, detached', function (): void {
    $agency = Agency::factory()->create();
    $agent = Agent::factory()->forAgency($agency)->create();

    $this->actingAs(User::factory()->create())
        ->delete(route('agencies.destroy', $agency))
        ->assertForbidden();

    $this->actingAs(User::factory()->admin()->create())
        ->delete(route('agencies.destroy', $agency))
        ->assertRedirect();

    expect(Agency::query()->whereKey($agency->id)->exists())->toBeFalse()
        ->and($agent->refresh()->agency_id)->toBeNull();
});

test('an agency has a detail page with its agents and the properties visited with them', function (): void {
    $agency = Agency::factory()->create(['name' => 'Agence du Marais']);
    $agent = Agent::factory()->forAgency($agency)->create(['first_name' => 'Zoé', 'last_name' => 'Martin']);
    Lead::factory()->create(['agent_id' => $agent->id, 'first_name' => 'Léa', 'last_name' => 'Durand']);
    Lead::factory()->create(['agent_id' => Agent::factory()->create()->id]);

    $this->actingAs(User::factory()->create())
        ->get(route('agencies.show', $agency))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('real-estate/agency')
            ->where('agency.name', 'Agence du Marais')
            ->where('agency.agents_count', 1)
            ->where('agency.agents.0.name', 'Zoé Martin')
            ->where('agency.agents.0.leads_count', 1)
            // Les biens visités avec l'agence ont leur propre test.
            ->has('agency.properties'));
});

test('a new agency is e-mailed only when asked, and only if it has an address', function (): void {
    Mail::fake();
    $member = User::factory()->create(['email' => 'charles@relocation-in-paris.fr']);

    $this->actingAs($member)->post(route('agencies.store'), ['name' => 'Silencieuse', 'email' => 'a@example.com'])->assertSessionHasNoErrors();
    $this->actingAs($member)->post(route('agencies.store'), ['name' => 'Sans adresse', 'phone' => '+33 1 00 00 00 00', 'notify' => true])->assertSessionHasNoErrors();
    Mail::assertNothingQueued();

    $this->actingAs($member)->post(route('agencies.store'), ['name' => 'Agence du Marais', 'email' => 'marais@example.com', 'notify' => true])->assertSessionHasNoErrors();

    Mail::assertQueued(DirectoryWelcome::class, fn (DirectoryWelcome $mail): bool => $mail->hasTo('marais@example.com')
        && $mail->name === 'Agence du Marais'
        && $mail->hasReplyTo('charles@relocation-in-paris.fr')
        && str_contains($mail->render(), 'agence immobilière partenaire'));
});

test('the fiche of an agency and of an agent carries its own activity journal', function (): void {
    $member = User::factory()->create(['name' => 'Camille']);
    $agency = Agency::factory()->create(['name' => 'Century 21 Marais']);
    $agent = Agent::factory()->forAgency($agency)->create(['first_name' => 'Julie', 'last_name' => 'Roux']);

    Activity::factory()->create(['agency_id' => $agency->id, 'user_id' => $member->id, 'resource' => 'agencies', 'message' => 'a noté un échange avec Century 21 Marais']);
    Activity::factory()->create(['agent_id' => $agent->id, 'resource' => 'agents', 'message' => 'a noté un échange avec Julie Roux']);
    Activity::factory()->create(['resource' => 'leads', 'message' => 'ailleurs']);

    $this->actingAs($member)->get(route('agencies.show', $agency))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->has('activities', 1)
            ->where('activities.0.message', 'a noté un échange avec Century 21 Marais')
            ->where('activities.0.actor.name', 'Camille'));

    $this->actingAs($member)->get(route('agents.show', $agent))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->has('activities', 1)
            ->where('activities.0.message', 'a noté un échange avec Julie Roux'));
});

test('an action on an agency or an agent is filed on its own fiche', function (): void {
    $member = User::factory()->create();
    $agency = Agency::factory()->create(['name' => 'Century 21 Marais']);
    $agent = Agent::factory()->create(['first_name' => 'Julie', 'last_name' => 'Roux']);

    (new RecordActivity)->handle(new DashboardUpdated('agencies', ['id' => $agency->id], 'a modifié l’agence Century 21 Marais', $member));
    (new RecordActivity)->handle(new DashboardUpdated('agents', ['id' => $agent->id], 'a modifié l’agent Julie Roux', $member));
    // Une action sur un agent porte aussi son agence quand le payload la donne.
    (new RecordActivity)->handle(new DashboardUpdated('agents', ['id' => $agent->id, 'agency_id' => $agency->id], 'a rattaché Julie Roux', $member));

    expect(Activity::query()->where('agency_id', $agency->id)->count())->toBe(2)
        ->and(Activity::query()->where('agent_id', $agent->id)->count())->toBe(2);
});

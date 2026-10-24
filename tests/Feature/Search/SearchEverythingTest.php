<?php

declare(strict_types=1);

use App\Actions\Search\SearchEverything;
use App\Enums\LeadStatus;
use App\Models\Agent;
use App\Models\Invoice;
use App\Models\Lead;
use App\Models\Property;
use App\Models\User;
use App\Models\Visit;

test('the unified search requires a member and answers only « mine » below two characters', function (): void {
    $this->getJson(route('search', ['q' => 'zo']))->assertUnauthorized();

    $member = User::factory()->create();
    $mine = Lead::factory()->converted()->create(['assigned_to' => $member->id, 'first_name' => 'Léa', 'last_name' => 'Durand']);
    Lead::factory()->converted()->create(['first_name' => 'Paul', 'last_name' => 'Autre']);

    $response = $this->actingAs($member)->getJson(route('search', ['q' => 'z']))->assertOk();

    expect($response->json('groups'))->toBe([])
        ->and($response->json('mine'))->toHaveCount(1)
        ->and($response->json('mine.0.uuid'))->toBe($mine->uuid)
        ->and($response->json('mine.0.url'))->toBe(route('clients.show', $mine));
});

test('dossiers, leads, visits and the rest come back grouped, best match first', function (): void {
    $member = User::factory()->create();
    $client = Lead::factory()->converted()->create(['first_name' => 'Zoé', 'last_name' => 'Martin']);
    $lead = Lead::factory()->create(['first_name' => 'Marc', 'last_name' => 'Zola', 'status' => LeadStatus::InProgress]);
    $property = Property::factory()->create(['street' => '3 rue Zoé-Oldenbourg', 'title' => 'Studio 11e']);
    $visit = Visit::factory()->create(['lead_id' => $client->id, 'property_id' => $property->id]);
    Invoice::factory()->create(['client_name' => 'Société Zo & Co']);
    Agent::factory()->create(['first_name' => 'Anne', 'last_name' => 'Zoé']);

    $response = $this->actingAs($member)->getJson(route('search', ['q' => 'zo']))->assertOk();
    $groups = collect($response->json('groups'))->keyBy('kind');

    // Un dossier client mène au dossier, un lead en cours à sa fiche.
    expect($groups->get('clients')['hits'][0]['url'])->toBe(route('clients.show', $client))
        ->and($groups->get('clients')['hits'][0]['score'])->toBe(3)
        ->and($groups->get('leads')['hits'][0]['url'])->toBe(route('leads.show', $lead))
        ->and($groups->get('leads')['hits'][0]['score'])->toBe(2)
        ->and($groups->get('visits')['hits'][0]['url'])->toBe(route('clients.visits.show', $visit))
        ->and($groups->get('properties')['hits'][0]['title'])->toBe('Studio 11e')
        ->and($groups->get('properties')['hits'][0]['score'])->toBe(1)
        ->and($groups->has('invoices'))->toBeTrue()
        ->and($groups->has('agents'))->toBeTrue();

    // Le groupe à la meilleure note passe en tête : les dossiers (3) avant les biens (1).
    $kinds = array_column($response->json('groups'), 'kind');
    expect(array_search('clients', $kinds, true))->toBeLessThan(array_search('properties', $kinds, true));
});

test('a phone number finds a lead by the end of its digits', function (): void {
    $member = User::factory()->create();
    $lead = Lead::factory()->create(['phone' => '+33 6 12 34 56 78', 'first_name' => 'Léa', 'last_name' => 'Durand']);

    $response = $this->actingAs($member)->getJson(route('search', ['q' => '34 56 78']))->assertOk();

    expect(collect($response->json('groups'))->keyBy('kind')->get('leads')['hits'][0]['uuid'])->toBe($lead->uuid);
});

test('a closed section is simply absent from the groups', function (): void {
    $member = User::factory()->create(['permissions' => ['invoices' => 'none', 'properties' => 'none']]);
    Invoice::factory()->create(['client_name' => 'Zoé Martin']);
    Property::factory()->create(['street' => '3 rue Zoé']);
    Lead::factory()->create(['first_name' => 'Zoé', 'last_name' => 'Martin']);

    $kinds = array_column($this->actingAs($member)->getJson(route('search', ['q' => 'zo']))->json('groups'), 'kind');

    expect($kinds)->toContain('leads')->not->toContain('invoices')->not->toContain('properties');
});

test('scores rank a title that starts with the needle above a word match above a mention elsewhere', function (): void {
    expect(SearchEverything::score('Léa Durand', 'lea'))->toBe(3)
        ->and(SearchEverything::score('Marc Zola', 'zo'))->toBe(2)
        ->and(SearchEverything::score('Jean-Zoé Martin', 'zo'))->toBe(2)
        ->and(SearchEverything::score('Studio 11e', 'zo'))->toBe(1);
});

test('the converting machine prefills a name handed by the palette', function (): void {
    $this->actingAs(User::factory()->create())
        ->get(route('leads.create', ['name' => 'léa durand-petit']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('prefill.first_name', 'Léa')->where('prefill.last_name', 'Durand-Petit'));
});

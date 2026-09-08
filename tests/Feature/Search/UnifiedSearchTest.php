<?php

declare(strict_types=1);

use App\Enums\OwnerStatus;
use App\Models\Invoice;
use App\Models\Owner;
use App\Models\Property;
use App\Models\Quote;
use App\Models\User;

/** Toutes les sources de la recherche ⌘K, avec un exemple de résultat attendu pour chacune. */
dataset('search endpoints', [
    'quotes' => ['tools.quotes.search', 'quotes'],
    'properties' => ['properties.search', 'properties'],
    'owners' => ['owners.search', 'owners'],
]);

test('search endpoints require an authenticated member', function (string $route): void {
    $this->get(route($route, ['q' => 'zo']))->assertRedirect(route('login'));
})->with('search endpoints');

test('search endpoints answer an empty list below two characters', function (string $route): void {
    $this->actingAs(User::factory()->create())
        ->getJson(route($route, ['q' => 'z']))
        ->assertOk()
        ->assertExactJson([]);
})->with('search endpoints');

test('a member whose section is closed is refused', function (string $route, string $section): void {
    $member = User::factory()->create(['permissions' => [$section => 'none']]);

    $this->actingAs($member)->getJson(route($route, ['q' => 'zo']))->assertForbidden();
})->with('search endpoints');

test('quotes are found by number or client name, eight at most, newest first', function (): void {
    $user = User::factory()->create();
    $quote = Quote::factory()->create(['client_name' => 'Zoé Martin', 'amount_cents' => 150_000, 'currency' => 'EUR']);
    Quote::factory()->create(['client_name' => 'Paul Durand']);
    Quote::factory()->count(9)->create(['client_name' => 'Zoom Corp']);

    $this->actingAs($user)
        ->getJson(route('tools.quotes.search', ['q' => 'zoé']))
        ->assertOk()
        ->assertJsonCount(1)
        ->assertJson([[
            'id' => $quote->id,
            'uuid' => $quote->uuid,
            'title' => $quote->number,
            'subtitle' => 'Zoé Martin · 1 500,00 € · '.$quote->status->label(),
            'url' => route('tools.quotes.show', $quote),
        ]])
        ->assertJsonStructure([['id', 'uuid', 'title', 'subtitle', 'url']]);

    $this->actingAs($user)->getJson(route('tools.quotes.search', ['q' => $quote->number]))->assertJsonCount(1);
    $this->actingAs($user)->getJson(route('tools.quotes.search', ['q' => 'zo']))->assertJsonCount(8);
});

test('properties are found by title, street, city or district, eight at most', function (): void {
    $user = User::factory()->create();
    $property = Property::factory()->create(['title' => 'Studio cosy', 'street' => '12 rue Oberkampf', 'postal_code' => '75011', 'city' => 'Paris', 'district' => 11]);
    Property::factory()->create(['title' => null, 'street' => '3 avenue Foch', 'district' => 16]);
    Property::factory()->count(9)->create(['title' => 'Loft', 'district' => 11]);

    $this->actingAs($user)
        ->getJson(route('properties.search', ['q' => 'cosy']))
        ->assertOk()
        ->assertExactJson([[
            'id' => $property->id,
            'uuid' => $property->uuid,
            'title' => 'Studio cosy',
            'subtitle' => '12 rue Oberkampf, 75011 Paris',
            'url' => route('properties.show', $property),
        ]]);

    $this->actingAs($user)->getJson(route('properties.search', ['q' => 'oberkampf']))->assertJsonCount(1);
    $this->actingAs($user)->getJson(route('properties.search', ['q' => 'foch']))->assertJsonCount(1)->assertJsonPath('0.title', '3 avenue Foch');
    $this->actingAs($user)->getJson(route('properties.search', ['q' => '16e']))->assertJsonCount(1);
    $this->actingAs($user)->getJson(route('properties.search', ['q' => '11']))->assertJsonCount(8);
    $this->actingAs($user)->getJson(route('properties.search', ['q' => 'paris']))->assertJsonCount(8);
});

test('owners are found by name, company, e-mail or phone, eight at most', function (): void {
    $user = User::factory()->create();
    $owner = Owner::factory()->create(['first_name' => 'Zoé', 'last_name' => 'Martin', 'company' => 'Foncière Zed', 'email' => 'zoe@example.com', 'phone' => '+33 6 11 22 33 44']);
    $contacted = Owner::factory()->status(OwnerStatus::Contacted)->create(['first_name' => 'Paul', 'last_name' => 'Durand', 'company' => null, 'email' => 'paul@example.com', 'phone' => '+33 6 99 88 77 66']);
    Owner::factory()->count(9)->create(['last_name' => 'Zola', 'company' => null]);

    $this->actingAs($user)
        ->getJson(route('owners.search', ['q' => 'zoé martin']))
        ->assertOk()
        ->assertExactJson([[
            'id' => $owner->id,
            'uuid' => $owner->uuid,
            'title' => 'Zoé Martin',
            'subtitle' => 'Foncière Zed',
            'url' => route('owners.show', $owner),
        ]]);

    $this->actingAs($user)->getJson(route('owners.search', ['q' => 'foncière']))->assertJsonCount(1);
    $this->actingAs($user)->getJson(route('owners.search', ['q' => 'zoe@']))->assertJsonCount(1);
    $this->actingAs($user)->getJson(route('owners.search', ['q' => '99 88']))->assertJsonCount(1)->assertJsonPath('0.subtitle', 'Contacté')->assertJsonPath('0.uuid', $contacted->uuid);
    $this->actingAs($user)->getJson(route('owners.search', ['q' => 'zo']))->assertJsonCount(8);
});

test('invoice search exposes the url of the invoice page', function (): void {
    $invoice = Invoice::factory()->create(['client_name' => 'Zoé Martin']);

    $this->actingAs(User::factory()->create())
        ->getJson(route('invoices.search', ['q' => 'zoé']))
        ->assertOk()
        ->assertJsonPath('0.uuid', $invoice->uuid)
        ->assertJsonPath('0.url', route('invoices.show', $invoice));
});

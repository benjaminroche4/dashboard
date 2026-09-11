<?php

declare(strict_types=1);

use App\Enums\PropertyStatus;
use App\Http\Controllers\Properties\PropertyController;
use App\Models\Property;
use App\Models\User;
use Inertia\Testing\AssertableInertia;

test('the directory paginates, so thousands of properties never land in one page', function (): void {
    $member = User::factory()->create();
    Property::factory()->count(PropertyController::PER_PAGE + 5)->create();

    $this->actingAs($member)
        ->get(route('properties.index'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('properties/index')
            ->has('properties', PropertyController::PER_PAGE)
            ->where('pagination.total', PropertyController::PER_PAGE + 5)
            ->where('pagination.last_page', 2)
            ->where('filters.q', '')
            ->where('filters.sort', 'created_at'));

    $this->actingAs($member)
        ->get(route('properties.index', ['page' => 2]))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->has('properties', 5)
            ->where('pagination.current_page', 2));
});

test('the search and the status filter run on the server, over the whole directory', function (): void {
    $member = User::factory()->create();
    Property::factory()->create(['title' => 'Loft Oberkampf', 'street' => '12 rue Oberkampf', 'status' => PropertyStatus::Available]);
    Property::factory()->create(['title' => null, 'street' => '3 rue des Martyrs', 'status' => PropertyStatus::Rented]);
    Property::factory()->count(3)->create(['status' => PropertyStatus::Unavailable]);

    // La recherche porte sur le titre, la rue et la ville.
    $this->actingAs($member)
        ->get(route('properties.index', ['q' => 'Martyrs']))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->has('properties', 1)
            ->where('properties.0.street', '3 rue des Martyrs')
            ->where('pagination.total', 1));

    // Le filtre accepte plusieurs statuts à la fois.
    $this->actingAs($member)
        ->get(route('properties.index', ['status' => ['unavailable', 'rented']]))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->has('properties', 4)
            ->where('filters.status', ['unavailable', 'rented']));

    // Les compteurs portent sur tout l'annuaire, pas sur la page affichée.
    $this->actingAs($member)
        ->get(route('properties.index', ['status' => ['rented']]))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->has('properties', 1)
            ->where('statusCounts.unavailable', 3));

    // Un statut inconnu est refusé.
    $this->actingAs($member)
        ->get(route('properties.index', ['status' => ['inconnu']]))
        ->assertSessionHasErrors('status.0');
});

test('the directory sorts by label, which is the title or the street', function (): void {
    $member = User::factory()->create();
    Property::factory()->create(['title' => 'Zéphyr', 'street' => '1 rue A']);
    Property::factory()->create(['title' => null, 'street' => 'Avenue des Alpes']);

    $this->actingAs($member)
        ->get(route('properties.index', ['sort' => 'label', 'dir' => 'asc']))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('properties.0.label', 'Avenue des Alpes')
            ->where('properties.1.label', 'Zéphyr'));
});

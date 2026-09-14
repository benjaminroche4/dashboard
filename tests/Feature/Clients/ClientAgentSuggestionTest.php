<?php

declare(strict_types=1);

use App\Actions\Clients\SuggestClientAgents;
use App\Enums\AgencySpecialty;
use App\Enums\Currency;
use App\Enums\Furnished;
use App\Enums\GuarantorType;
use App\Enums\LeadLanguage;
use App\Enums\PropertyApplicationStatus;
use App\Enums\PropertyType;
use App\Enums\RelationshipQuality;
use App\Enums\SpokenLanguage;
use App\Enums\VisitStatus;
use App\Models\Agency;
use App\Models\Agent;
use App\Models\Lead;
use App\Models\Property;
use App\Models\User;
use App\Models\Visit;
use App\Support\ParisArrondissements;
use Inertia\Testing\AssertableInertia;

test('agents are scored on territory, segment, results, availability and relationship, and the agency takes its best agent', function (): void {
    $advisor = User::factory()->create();
    $client = Lead::factory()->converted()->create([
        'assigned_to' => $advisor->id,
        'budget_cents' => 200_000,
        'currency' => Currency::EUR,
        'districts' => [11],
        'property_types' => [PropertyType::T2],
        'furnished' => Furnished::Furnished,
        'language' => LeadLanguage::English,
        'guarantors' => [GuarantorType::Garantme],
    ]);

    $agency = Agency::factory()->create(['name' => 'Agence Oberkampf', 'postal_code' => '75011', 'accepts_garantme' => true, 'accepts_foreign_files' => true, 'languages' => [SpokenLanguage::English]]);
    $star = Agent::factory()->forAgency($agency)->create(['first_name' => 'Zoé', 'last_name' => 'Martin', 'relationship_quality' => RelationshipQuality::Excellent, 'last_contacted_at' => now()->subDays(3)]);
    $star->favorites()->create(['user_id' => $advisor->id]);
    $junior = Agent::factory()->forAgency($agency)->create(['relationship_quality' => RelationshipQuality::Difficult]);

    // Deux biens de Zoé dans le 11e (T2 meublés dans le budget), un dossier accepté, une visite faite.
    $accepted = Property::factory()->create(['agent_id' => $star->id, 'district' => 11, 'rent_cents' => 180_000, 'property_type' => PropertyType::T2, 'furnished' => Furnished::Furnished]);
    Property::factory()->create(['agent_id' => $star->id, 'district' => 11, 'rent_cents' => 190_000, 'property_type' => PropertyType::T2, 'furnished' => Furnished::Furnished]);
    $other = Lead::factory()->converted()->create();
    $other->properties()->attach($accepted->id, ['status' => PropertyApplicationStatus::Accepted, 'status_at' => now()]);
    Visit::factory()->status(VisitStatus::Done)->create(['lead_id' => $other->id, 'property_id' => $accepted->id, 'agent_id' => $star->id, 'scheduled_at' => now()->subWeek()]);

    // Un indépendant dans le 20e (voisin du 11e), sans autre atout.
    $independent = Agent::factory()->create(['first_name' => 'Léo', 'last_name' => 'Petit', 'postal_code' => '75020', 'city' => 'Paris']);
    Property::factory()->create(['agent_id' => $independent->id, 'district' => 20, 'rent_cents' => 150_000]);

    // Une agence loin de tout : aucune raison de la proposer.
    $far = Agency::factory()->create(['postal_code' => '92100', 'city' => 'Boulogne']);
    Agent::factory()->forAgency($far)->create();

    $rows = (new SuggestClientAgents)->handle($client);

    expect($rows)->toHaveCount(2)
        ->and($rows[0]['agency']->id)->toBe($agency->id)
        ->and($rows[0]['agents'][0]['agent']->id)->toBe($star->id)
        ->and($rows[0]['reasons'])->toContain('2 biens dans les quartiers visés', 'Installée dans le 11e', 'Loyers dans la gamme du budget', 'Habitué au type de bien recherché', 'Spécialiste du meublé', 'Parle anglais', 'Accepte les dossiers étrangers', 'Accepte Garantme', '1 dossier accepté avec cet agent', '1 visite réalisée ensemble', 'Excellente relation', 'Contact récent', 'Favori du conseiller')
        ->and($rows[0]['available_properties'])->toBe(2)
        // L'agent « difficile » de la même agence reste derrière, et n'entraîne pas l'agence vers le bas.
        ->and(collect($rows[0]['agents'])->pluck('agent.id')->all())->toBe([$star->id, $junior->id])
        ->and($rows[1]['agency'])->toBeNull()
        ->and($rows[1]['agents'][0]['agent']->id)->toBe($independent->id)
        ->and($rows[1]['reasons'])->toContain('Des biens dans les quartiers voisins')
        ->and(collect($rows)->pluck('agency.id')->all())->not->toContain($far->id);
});

test('an agency without agents is scored on its own profile, and the dossier exposes the suggestions', function (): void {
    $client = Lead::factory()->converted()->create(['budget_cents' => 150_000, 'currency' => Currency::EUR, 'districts' => [5, 6], 'furnished' => Furnished::Unfurnished]);
    Agency::factory()->create(['name' => 'Rive Gauche Immo', 'postal_code' => '75005', 'districts' => [5, 6, 7], 'specialties' => [AgencySpecialty::Unfurnished], 'rent_min_cents' => 100_000, 'rent_max_cents' => 300_000]);
    Agency::factory()->create(['name' => 'Sans rapport', 'postal_code' => '75018']);

    $this->actingAs(User::factory()->create())
        ->get(route('clients.show', $client))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->has('suggestedAgents', 1)
            ->where('suggestedAgents.0.key', fn (string $key): bool => str_starts_with($key, 'agency:'))
            ->where('suggestedAgents.0.agency.name', 'Rive Gauche Immo')
            ->where('suggestedAgents.0.agency.has_profile', true)
            ->where('suggestedAgents.0.best_agent', null)
            ->where('suggestedAgents.0.reasons', ['Couvre le 5e, 6e', 'Installée dans le 5e', 'Budget dans sa gamme annoncée', 'Spécialiste du non meublé']));
});

test('neighbouring districts and postal codes are read from the arrondissement table', function (): void {
    expect(ParisArrondissements::neighbours([11]))->toBe([3, 4, 10, 12, 20])
        ->and(ParisArrondissements::neighbours([3, 4]))->toBe([1, 2, 5, 10, 11, 12])
        ->and(ParisArrondissements::fromPostalCode('75011'))->toBe(11)
        ->and(ParisArrondissements::fromPostalCode('75001'))->toBe(1)
        ->and(ParisArrondissements::fromPostalCode('92100'))->toBeNull()
        ->and(ParisArrondissements::fromPostalCode(null))->toBeNull();
});

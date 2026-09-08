<?php

declare(strict_types=1);

use App\Actions\Clients\SuggestClientProperties;
use App\Enums\Currency;
use App\Enums\Furnished;
use App\Enums\PropertyType;
use App\Models\Lead;
use App\Models\Property;
use App\Models\User;
use App\Models\Visit;
use Inertia\Testing\AssertableInertia;

test('properties are scored against the client project and the best matches come first', function (): void {
    $client = Lead::factory()->converted()->create([
        'budget_cents' => 180_000,
        'currency' => Currency::EUR,
        'districts' => [3, 11],
        'property_types' => [PropertyType::T2, PropertyType::T3],
        'furnished' => Furnished::Furnished,
    ]);
    $perfect = Property::factory()->create(['title' => 'T2 · 11e', 'district' => 11, 'rent_cents' => 150_000, 'property_type' => PropertyType::T2, 'furnished' => Furnished::Furnished, 'created_at' => now()->subDays(3)]);
    $slightlyOver = Property::factory()->create(['title' => 'T3 · 3e', 'district' => 3, 'rent_cents' => 195_000, 'property_type' => PropertyType::T3, 'furnished' => Furnished::Unfurnished]);
    $tooExpensive = Property::factory()->create(['title' => 'Loft · 11e', 'district' => 11, 'rent_cents' => 300_000, 'property_type' => PropertyType::T2, 'furnished' => Furnished::Furnished]);
    $elsewhere = Property::factory()->create(['title' => 'Studio · 18e', 'district' => 18, 'rent_cents' => 90_000, 'property_type' => PropertyType::Studio, 'furnished' => Furnished::Unfurnished]);
    $linked = Property::factory()->create(['district' => 11, 'rent_cents' => 100_000, 'property_type' => PropertyType::T2, 'furnished' => Furnished::Furnished]);
    $visited = Property::factory()->create(['district' => 11, 'rent_cents' => 100_000, 'property_type' => PropertyType::T2, 'furnished' => Furnished::Furnished]);
    $client->properties()->attach($linked->id);
    Visit::factory()->create(['lead_id' => $client->id, 'property_id' => $visited->id]);

    $matches = (new SuggestClientProperties)->handle($client);

    expect(array_map(fn (array $match): int => $match['property']->id, $matches))->toBe([$perfect->id, $slightlyOver->id, $elsewhere->id])
        ->and($matches[0]['score'])->toBe(9)
        ->and($matches[0]['reasons'])->toBe(['Dans le budget', 'Arrondissement recherché (11e)', 'Type de bien recherché (T2)', 'Meublé'])
        ->and($matches[1]['score'])->toBe(6)
        ->and($matches[1]['reasons'][0])->toBe('Budget dépassé de moins de 10 %')
        ->and($matches[2]['score'])->toBe(3)
        ->and(collect($matches)->pluck('property.id')->all())->not->toContain($tooExpensive->id);
});

test('a client without any project criteria gets no suggestion, and the dossier exposes the matches', function (): void {
    $blank = Lead::factory()->converted()->create(['budget_cents' => null, 'districts' => [], 'property_types' => [], 'furnished' => null]);
    // Hors budget pour le second client (200 000) : ils ne polluent pas ses suggestions.
    Property::factory()->count(2)->create(['currency' => Currency::EUR, 'rent_cents' => 900_000]);
    expect((new SuggestClientProperties)->handle($blank))->toBe([]);

    // Type et meublé neutralisés des deux côtés : seuls le budget (3) et l'arrondissement (3) comptent.
    $client = Lead::factory()->converted()->create(['budget_cents' => 200_000, 'currency' => Currency::EUR, 'districts' => [5], 'property_types' => [], 'furnished' => null]);
    Property::factory()->create(['title' => 'T2 · 5e', 'district' => 5, 'rent_cents' => 150_000, 'currency' => Currency::EUR]);

    $this->actingAs(User::factory()->create())
        ->get(route('clients.show', $client))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->has('suggestedProperties', 1)
            ->where('suggestedProperties.0.label', 'T2 · 5e')
            ->where('suggestedProperties.0.score', 6)
            ->where('suggestedProperties.0.reasons', ['Dans le budget', 'Arrondissement recherché (5e)']));
});

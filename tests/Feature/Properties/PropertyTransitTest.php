<?php

declare(strict_types=1);

use Anthropic\Messages\OutputConfig\Effort;
use App\Actions\Properties\FindNearbyTransit;
use App\Enums\TransitKind;
use App\Models\Property;
use App\Models\User;
use App\Services\Assistant;
use Inertia\Testing\AssertableInertia;

/** Assistant simulé : renvoie les arrêts préparés et mémorise le prompt reçu. */
function fakeTransitAssistant(array $reply, bool $configured = true): Assistant
{
    return new class($reply, $configured) extends Assistant
    {
        public string $lastPrompt = '';

        public int $calls = 0;

        public function __construct(private readonly array $reply, private readonly bool $configured)
        {
            parent::__construct(key: $configured ? 'test-key' : null, model: 'claude-opus-5');
        }

        public function isConfigured(): bool
        {
            return $this->configured;
        }

        public function extract(string $system, string $prompt, array $schema, int $maxTokens = 8000, Effort $effort = Effort::LOW): array
        {
            throw_unless($this->configured, RuntimeException::class, 'Assistant IA non configuré (ANTHROPIC_API_KEY).');

            $this->calls++;
            $this->lastPrompt = $prompt;

            return $this->reply;
        }
    };
}

$reply = [
    'stops' => [
        ['kind' => 'metro', 'name' => 'Oberkampf', 'lines' => ['2', '9'], 'minutes' => 4],
        ['kind' => 'bus', 'name' => 'Saint-Maur', 'lines' => ['96'], 'minutes' => null],
        // Arrêt inutilisable : sans nom, il est écarté sans faire échouer la recherche.
        ['kind' => 'bus', 'name' => '  ', 'lines' => [], 'minutes' => 3],
    ],
];

test('the assistant proposes the transport around the address, once per address', function () use ($reply): void {
    $assistant = fakeTransitAssistant($reply);
    app()->instance(Assistant::class, $assistant);

    $transit = resolve(FindNearbyTransit::class)->handle('12 rue Oberkampf, 75011 Paris');

    expect($transit->stops)->toHaveCount(2)
        ->and($transit->stops[0]->kind)->toBe(TransitKind::Metro)
        ->and($transit->stops[0]->name)->toBe('Oberkampf')
        ->and($transit->stops[0]->lines)->toBe(['2', '9'])
        ->and($transit->stops[0]->label())->toBe('Métro Oberkampf · 2, 9 · 4 min à pied')
        ->and($transit->stops[1]->label())->toBe('Bus Saint-Maur · 96')
        ->and($assistant->lastPrompt)->toContain('12 rue Oberkampf, 75011 Paris');

    // La même adresse ne repart pas chez l'assistant : la réponse est en cache.
    resolve(FindNearbyTransit::class)->handle('12  rue Oberkampf,  75011 Paris');
    expect($assistant->calls)->toBe(1);
});

test('the route returns the stops for a signed-in member', function () use ($reply): void {
    app()->instance(Assistant::class, fakeTransitAssistant($reply));

    // Hors connexion, la route ne répond pas (JSON : 401, pas de redirection).
    $this->postJson(route('properties.transit'), ['street' => '12 rue Oberkampf'])
        ->assertUnauthorized();

    $this->actingAs(User::factory()->create())
        ->postJson(route('properties.transit'), [
            'street' => '12 rue Oberkampf',
            'postal_code' => '75011',
            'city' => 'Paris',
        ])
        ->assertOk()
        ->assertJsonPath('stops.0.kind', 'metro')
        ->assertJsonPath('stops.0.name', 'Oberkampf')
        ->assertJsonPath('stops.0.minutes', 4)
        ->assertJsonCount(2, 'stops');
});

test('the route refuses an address without a street and reports an unconfigured assistant', function () use ($reply): void {
    $staff = User::factory()->create();
    app()->instance(Assistant::class, fakeTransitAssistant($reply, configured: false));

    $this->actingAs($staff)->postJson(route('properties.transit'), ['city' => 'Paris'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('street');

    $this->actingAs($staff)->postJson(route('properties.transit'), ['street' => '12 rue Oberkampf'])
        ->assertUnprocessable()
        ->assertJsonPath('message', 'Assistant IA non configuré (ANTHROPIC_API_KEY).');
});

test('the reviewed stops are saved with the property and shown on its page', function (): void {
    $staff = User::factory()->create();

    $this->actingAs($staff)->post(route('properties.store'), [
        'street' => '12 rue Oberkampf',
        'postal_code' => '75011',
        'city' => 'Paris',
        'floor' => 'top',
        'transit' => [
            ['kind' => 'metro', 'name' => 'Oberkampf', 'lines' => ['2', '9'], 'minutes' => 4],
            ['kind' => 'bus', 'name' => 'Saint-Maur', 'lines' => ['96'], 'minutes' => null],
        ],
    ])->assertSessionHasNoErrors();

    $property = Property::query()->latest('id')->firstOrFail();
    expect($property->transit)->toHaveCount(2)
        ->and($property->transit[0]['name'])->toBe('Oberkampf');

    $this->actingAs($staff)->get(route('properties.show', $property))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('property.transit.0.kind', 'metro')
            ->where('property.transit.0.lines.1', '9'));

    // Un arrêt d'une nature inconnue est refusé.
    $this->actingAs($staff)->post(route('properties.store'), [
        'street' => 'A',
        'transit' => [['kind' => 'taxi', 'name' => 'X', 'lines' => [], 'minutes' => null]],
    ])->assertSessionHasErrors('transit.0.kind');
});

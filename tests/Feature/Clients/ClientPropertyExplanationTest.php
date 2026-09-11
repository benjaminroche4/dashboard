<?php

declare(strict_types=1);

use Anthropic\Messages\OutputConfig\Effort;
use App\Enums\Currency;
use App\Enums\PropertyFloor;
use App\Models\Lead;
use App\Models\Property;
use App\Models\User;
use App\Services\Assistant;
use Illuminate\Support\Facades\Cache;

/** Assistant simulé : réponse préparée, compte les appels, mémorise le prompt. */
function explanationAssistant(array $reply, bool $configured = true): Assistant
{
    return new class($reply, $configured) extends Assistant
    {
        public int $calls = 0;

        public string $lastPrompt = '';

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

test('the assistant ranks the suggestions and explains each one, the result being cached per dossier', function (): void {
    Cache::flush();
    $client = Lead::factory()->converted()->create(['budget_cents' => 200_000, 'currency' => Currency::EUR, 'districts' => [11], 'message' => 'Cherche du calme, dernier étage si possible, avec mon chat.']);
    $dark = Property::factory()->create(['title' => 'T2 sur cour', 'district' => 11, 'rent_cents' => 150_000, 'notes' => 'Rez-de-chaussée sur cour.', 'created_at' => now()]);
    $bright = Property::factory()->create(['title' => 'T2 dernier étage', 'district' => 11, 'rent_cents' => 160_000, 'floor' => PropertyFloor::Sixth, 'notes' => 'Animaux acceptés.', 'created_at' => now()->subDay()]);
    $assistant = explanationAssistant([
        'properties' => [
            ['id' => $dark->id, 'fit' => 'weak', 'reason' => 'Rez-de-chaussée sur cour alors que le client veut de la lumière.'],
            ['id' => $bright->id, 'fit' => 'strong', 'reason' => 'Dernier étage calme et animaux acceptés.'],
            ['id' => 999_999, 'fit' => 'strong', 'reason' => 'Inventé.'],
        ],
        'ranking' => [$bright->id, 999_999],
    ]);
    app()->instance(Assistant::class, $assistant);

    $this->actingAs(User::factory()->create())
        ->postJson(route('clients.properties.explain', $client))
        ->assertOk()
        ->assertJsonPath('ranking', [$bright->id, $dark->id])
        ->assertJsonCount(2, 'explanations')
        ->assertJsonFragment(['id' => $bright->id, 'fit' => 'strong', 'reason' => 'Dernier étage calme et animaux acceptés.']);

    expect($assistant->lastPrompt)->toContain('avec mon chat')->toContain('Animaux acceptés')->toContain('Score à points');

    // Même dossier, mêmes biens : le cache répond, l'assistant n'est pas rappelé.
    $this->actingAs(User::factory()->create())->postJson(route('clients.properties.explain', $client))->assertOk();
    expect($assistant->calls)->toBe(1);
});

test('without suggestions or without an assistant, the route answers cleanly', function (): void {
    Cache::flush();
    $client = Lead::factory()->converted()->create(['budget_cents' => null, 'districts' => [], 'property_types' => [], 'furnished' => null]);
    app()->instance(Assistant::class, explanationAssistant([], configured: false));

    $this->actingAs(User::factory()->create())
        ->postJson(route('clients.properties.explain', $client))
        ->assertOk()
        ->assertJsonPath('ranking', [])
        ->assertJsonPath('explanations', []);

    $matching = Lead::factory()->converted()->create(['budget_cents' => 200_000, 'currency' => Currency::EUR, 'districts' => [5]]);
    Property::factory()->create(['district' => 5, 'rent_cents' => 150_000]);

    $this->actingAs(User::factory()->create())
        ->postJson(route('clients.properties.explain', $matching))
        ->assertStatus(422)
        ->assertJsonPath('message', 'Assistant IA non configuré (ANTHROPIC_API_KEY).');

    $this->actingAs(User::factory()->create())
        ->postJson(route('clients.properties.explain', Lead::factory()->create()))
        ->assertNotFound();
});

<?php

declare(strict_types=1);

use Anthropic\Messages\OutputConfig\Effort;
use App\Enums\Currency;
use App\Models\Agency;
use App\Models\Agent;
use App\Models\Lead;
use App\Models\Property;
use App\Models\User;
use App\Services\Assistant;
use Illuminate\Support\Facades\Cache;

/** Assistant simulé : réponse préparée, compte les appels, mémorise le prompt. */
function agentExplanationAssistant(array $reply, bool $configured = true): Assistant
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

test('the assistant ranks the suggested agencies and explains each one, the result being cached', function (): void {
    Cache::flush();
    $client = Lead::factory()->converted()->create(['budget_cents' => 200_000, 'currency' => Currency::EUR, 'districts' => [11], 'message' => 'Arrive de Londres avec un chien.']);
    $marais = Agency::factory()->create(['name' => 'Marais Immo', 'postal_code' => '75011', 'notes' => 'Refuse les animaux.']);
    Agent::factory()->forAgency($marais)->create();
    $ober = Agency::factory()->create(['name' => 'Oberkampf Immo', 'postal_code' => '75011', 'notes' => 'Animaux acceptés.']);
    $agent = Agent::factory()->forAgency($ober)->create();
    Property::factory()->create(['agent_id' => $agent->id, 'district' => 11, 'rent_cents' => 150_000]);

    $assistant = agentExplanationAssistant([
        'agencies' => [
            ['key' => "agency:{$marais->id}", 'fit' => 'weak', 'reason' => 'Refuse les animaux alors que le client a un chien.'],
            ['key' => "agency:{$ober->id}", 'fit' => 'strong', 'reason' => 'Animaux acceptés et biens dans le 11e.'],
            ['key' => 'agency:999999', 'fit' => 'strong', 'reason' => 'Inventée.'],
        ],
        'ranking' => ["agency:{$ober->id}", 'agency:999999'],
    ]);
    app()->instance(Assistant::class, $assistant);

    $this->actingAs(User::factory()->create())
        ->postJson(route('clients.agencies.explain', $client))
        ->assertOk()
        ->assertJsonPath('ranking', ["agency:{$ober->id}", "agency:{$marais->id}"])
        ->assertJsonCount(2, 'explanations')
        ->assertJsonFragment(['key' => "agency:{$ober->id}", 'fit' => 'strong', 'reason' => 'Animaux acceptés et biens dans le 11e.']);

    expect($assistant->lastPrompt)->toContain('avec un chien')->toContain('Refuse les animaux')->toContain('Score à points');

    $this->actingAs(User::factory()->create())->postJson(route('clients.agencies.explain', $client))->assertOk();
    expect($assistant->calls)->toBe(1);
});

test('without suggestions or without an assistant, the route answers cleanly', function (): void {
    Cache::flush();
    $blank = Lead::factory()->converted()->create(['districts' => [], 'budget_cents' => null]);
    app()->instance(Assistant::class, agentExplanationAssistant([], configured: false));

    $this->actingAs(User::factory()->create())
        ->postJson(route('clients.agencies.explain', $blank))
        ->assertOk()
        ->assertJsonPath('ranking', [])
        ->assertJsonPath('explanations', []);

    $client = Lead::factory()->converted()->create(['districts' => [5]]);
    Agency::factory()->create(['postal_code' => '75005']);

    $this->actingAs(User::factory()->create())
        ->postJson(route('clients.agencies.explain', $client))
        ->assertStatus(422)
        ->assertJsonPath('message', 'Assistant IA non configuré (ANTHROPIC_API_KEY).');

    $this->actingAs(User::factory()->create())
        ->postJson(route('clients.agencies.explain', Lead::factory()->create()))
        ->assertNotFound();
});

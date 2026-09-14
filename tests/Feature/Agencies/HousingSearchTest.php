<?php

declare(strict_types=1);

use Anthropic\Messages\OutputConfig\Effort;
use App\Enums\Currency;
use App\Enums\PropertyType;
use App\Mail\HousingSearchSent;
use App\Models\Agency;
use App\Models\Agent;
use App\Models\Lead;
use App\Models\User;
use App\Services\Assistant;
use Illuminate\Support\Facades\Mail;

test('the search goes to the agency or one of its agents, without the client contact details, and is logged', function (): void {
    Mail::fake();
    config()->set('company.mail.sender_domains', ['relocation-in-paris.fr']);
    $advisor = User::factory()->create(['name' => 'Charles Petit', 'email' => 'charles@relocation-in-paris.fr']);
    $client = Lead::factory()->converted()->create(['first_name' => 'Léa', 'last_name' => 'Durand', 'email' => 'lea@example.com', 'phone' => '+33 6 00 00 00 00', 'assigned_to' => $advisor->id, 'budget_cents' => 180_000, 'currency' => Currency::EUR, 'districts' => [11, 3], 'property_types' => [PropertyType::T2]]);
    $agency = Agency::factory()->create(['name' => 'Oberkampf Immo', 'email' => 'contact@oberkampf.example']);
    $agent = Agent::factory()->forAgency($agency)->create(['first_name' => 'Zoé', 'last_name' => 'Martin', 'email' => 'zoe@oberkampf.example']);

    $this->actingAs($advisor)
        ->post(route('clients.agencies.send', $client), [
            'agency_id' => $agency->id,
            'agent_id' => $agent->id,
            'email' => 'zoe@oberkampf.example',
            'message' => 'Bonjour Zoé, nous cherchons un T2 meublé dans le 11e pour un client qui arrive en octobre.',
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    Mail::assertQueued(HousingSearchSent::class, function (HousingSearchSent $mail) use ($agent): bool {
        $rendered = $mail->render();

        return $mail->hasTo('zoe@oberkampf.example')
            && ($mail->from[0]['address'] ?? null) === 'charles@relocation-in-paris.fr'
            && $mail->hasReplyTo('charles@relocation-in-paris.fr')
            && $mail->agent?->is($agent)
            && str_contains($mail->envelope()->subject, 'Recherche T2 · Paris 3e, 11e')
            && str_contains($rendered, 'Bonjour Zoé')
            && str_contains($rendered, '1 800 EUR charges comprises')
            // Le projet part, pas les coordonnées du client.
            && ! str_contains($rendered, 'lea@example.com')
            && ! str_contains($rendered, 'Durand');
    });

    expect($client->notes()->latest('id')->first()?->body)->toBe('Recherche envoyée à Oberkampf Immo (Zoé Martin) : zoe@oberkampf.example.')
        ->and($agency->fresh()->last_contacted_at)->not->toBeNull()
        ->and($agent->fresh()->last_contacted_at)->not->toBeNull();
});

test('a free address is refused, and a lead that is not a client answers 404', function (): void {
    Mail::fake();
    $client = Lead::factory()->converted()->create();
    $agency = Agency::factory()->create(['email' => 'contact@agence.example']);

    $this->actingAs(User::factory()->create())
        ->from(route('clients.show', $client))
        ->post(route('clients.agencies.send', $client), ['agency_id' => $agency->id, 'email' => 'someone@else.example', 'message' => str_repeat('Bonjour, voici la recherche. ', 3)])
        ->assertSessionHasErrors('email');

    $this->actingAs(User::factory()->create())
        ->post(route('clients.agencies.send', Lead::factory()->create()), ['agency_id' => $agency->id, 'email' => 'contact@agence.example', 'message' => str_repeat('Bonjour, voici la recherche. ', 3)])
        ->assertNotFound();

    Mail::assertNothingQueued();
});

test('the assistant drafts the accompanying message from the project and the agency', function (): void {
    $assistant = new class extends Assistant
    {
        public string $lastPrompt = '';

        public function __construct()
        {
            parent::__construct(key: 'test-key', model: 'claude-opus-5');
        }

        public function extract(string $system, string $prompt, array $schema, int $maxTokens = 8000, Effort $effort = Effort::LOW): array
        {
            $this->lastPrompt = $prompt;

            return ['message' => 'Bonjour Zoé, nous cherchons…'];
        }
    };
    app()->instance(Assistant::class, $assistant);
    $advisor = User::factory()->create(['name' => 'Charles Petit']);
    $client = Lead::factory()->converted()->create(['first_name' => 'Léa', 'districts' => [11], 'budget_cents' => 180_000, 'currency' => Currency::EUR]);
    $agency = Agency::factory()->create(['name' => 'Oberkampf Immo']);
    $agent = Agent::factory()->forAgency($agency)->create(['first_name' => 'Zoé', 'last_name' => 'Martin']);

    $this->actingAs($advisor)
        ->postJson(route('clients.agencies.draft', $client), ['agent_id' => $agent->id])
        ->assertOk()
        ->assertJsonPath('message', 'Bonjour Zoé, nous cherchons…');

    expect($assistant->lastPrompt)->toContain('Conseiller : Charles Petit')->toContain('Agence : Oberkampf Immo')->toContain('Agent : Zoé Martin')->toContain('Arrondissements : 11e')->toContain('Client : Léa');
});

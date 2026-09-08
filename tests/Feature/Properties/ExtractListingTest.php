<?php

declare(strict_types=1);

use App\Actions\Properties\ExtractListing;
use App\Data\ListingExtractionData;
use App\Enums\Furnished;
use App\Enums\LeaseType;
use App\Enums\PropertyType;
use App\Models\User;
use App\Services\Assistant;
use App\Services\ListingFetcher;
use Illuminate\Support\Facades\Http;

/** Assistant simulé : renvoie la réponse préparée et mémorise le prompt reçu. */
function fakeAssistant(array $reply, bool $configured = true): Assistant
{
    return new class($reply, $configured) extends Assistant
    {
        public string $lastPrompt = '';

        public function __construct(private readonly array $reply, private readonly bool $configured)
        {
            parent::__construct(key: $configured ? 'test-key' : null, model: 'claude-opus-5');
        }

        public function isConfigured(): bool
        {
            return $this->configured;
        }

        public function extract(string $system, string $prompt, array $schema, int $maxTokens = 4000): array
        {
            throw_unless($this->configured, RuntimeException::class, 'Assistant IA non configuré (ANTHROPIC_API_KEY).');

            $this->lastPrompt = $prompt;

            return $this->reply;
        }
    };
}

$reply = [
    'title' => 'T2 lumineux · 11e',
    'street' => '12 rue Oberkampf',
    'postal_code' => '75011',
    'city' => null,
    'district' => null,
    'property_type' => 't2',
    'furnished' => 'furnished',
    'rooms' => 2,
    'surface_m2' => 42,
    'floor' => 3,
    'lease_type' => 'alur',
    'rent' => 1500.5,
    'charges' => 80,
    'currency' => 'EUR',
    'agent_name' => 'Zoé Martin',
    'agency_name' => 'Agence du Marais',
    'notes' => 'Appartement traversant au 3e étage avec ascenseur.',
    'highlights' => ['Ascenseur', 'Cuisine équipée', ''],
];

test('an extraction is normalised: enums checked, district from the postal code, money in cents, form values', function () use ($reply): void {
    $data = ListingExtractionData::from($reply, 'https://example.com/annonce');

    expect($data->district)->toBe(11)
        ->and($data->city)->toBe('Paris')
        ->and($data->propertyType)->toBe(PropertyType::T2)
        ->and($data->furnished)->toBe(Furnished::Furnished)
        ->and($data->leaseType)->toBe(LeaseType::Alur)
        ->and($data->rentCents)->toBe(150_050)
        ->and($data->chargesCents)->toBe(8_000)
        ->and($data->highlights)->toBe(['Ascenseur', 'Cuisine équipée'])
        ->and($data->toForm())->toMatchArray(['street' => '12 rue Oberkampf', 'district' => '11', 'rent' => '1500.5', 'charges' => '80', 'listing_url' => 'https://example.com/annonce', 'property_type' => 't2'])
        ->and($data->filledFields())->toContain('rent', 'title')
        ->and(ListingExtractionData::from(['street' => '', 'property_type' => 'villa', 'currency' => 'USD'])->propertyType)->toBeNull()
        ->and(ListingExtractionData::from(['street' => '', 'currency' => 'USD'])->currency->value)->toBe('EUR');
});

test('a listing page is reduced to its visible text', function (): void {
    $html = '<html><head><style>p{}</style><script>var a=1;</script></head><body><h1>T2 &agrave; louer</h1><p>Loyer&nbsp;: 1 500 €</p><div>Meublé</div></body></html>';

    expect(ListingFetcher::toText($html))->toBe("T2 à louer\nLoyer : 1 500 €\nMeublé");
});

test('a pasted URL is fetched then read by the assistant, and the route returns the prefilled form', function () use ($reply): void {
    Http::fake(['https://www.seloger.com/*' => Http::response('<html><body><h1>T2 Oberkampf</h1><p>1 500 € / mois</p></body></html>')]);
    $assistant = fakeAssistant($reply);
    app()->instance(Assistant::class, $assistant);

    $this->actingAs(User::factory()->create())
        ->postJson(route('properties.extract'), ['input' => 'https://www.seloger.com/annonces/123.htm'])
        ->assertOk()
        ->assertJsonPath('source', 'url')
        ->assertJsonPath('property.street', '12 rue Oberkampf')
        ->assertJsonPath('property.district', '11')
        ->assertJsonPath('property.listing_url', 'https://www.seloger.com/annonces/123.htm')
        ->assertJsonPath('agent_name', 'Zoé Martin')
        ->assertJsonPath('highlights', ['Ascenseur', 'Cuisine équipée']);

    expect($assistant->lastPrompt)->toContain('T2 Oberkampf')->toContain('1 500 € / mois');
});

test('pasted text goes straight to the assistant, an unreachable page and a missing key answer 422', function () use ($reply): void {
    Http::fake(['https://blocked.example/*' => Http::response('', 403)]);
    $member = User::factory()->create();

    app()->instance(Assistant::class, fakeAssistant($reply));
    $this->actingAs($member)
        ->postJson(route('properties.extract'), ['input' => 'T2 meublé 42 m² rue Oberkampf, 1 500 € cc'])
        ->assertOk()
        ->assertJsonPath('source', 'text')
        ->assertJsonPath('property.listing_url', '');

    $this->actingAs($member)
        ->postJson(route('properties.extract'), ['input' => 'https://blocked.example/annonce'])
        ->assertStatus(422)
        ->assertJsonPath('message', "Impossible de lire cette page. Copiez-collez le texte de l'annonce à la place.");

    app()->instance(Assistant::class, fakeAssistant($reply, configured: false));
    $this->actingAs($member)
        ->postJson(route('properties.extract'), ['input' => 'T2 meublé 42 m² rue Oberkampf, 1 500 € cc'])
        ->assertStatus(422);

    $this->actingAs($member)->postJson(route('properties.extract'), ['input' => 'court'])->assertStatus(422);
});

test('guests cannot use the extraction route', function (): void {
    $this->postJson(route('properties.extract'), ['input' => 'T2 meublé 42 m² rue Oberkampf'])->assertUnauthorized();
});

test('the extraction action recognises a lone URL only', function (): void {
    expect(ExtractListing::url('https://www.pap.fr/annonce/1'))->toBe('https://www.pap.fr/annonce/1')
        ->and(ExtractListing::url('Voir https://www.pap.fr/annonce/1 svp'))->toBeNull()
        ->and(ExtractListing::url('T2 à louer'))->toBeNull();
});

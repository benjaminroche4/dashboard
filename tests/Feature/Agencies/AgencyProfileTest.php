<?php

declare(strict_types=1);

use Anthropic\Messages\OutputConfig\Effort;
use App\Enums\AgencySpecialty;
use App\Enums\SpokenLanguage;
use App\Models\Agency;
use App\Models\Agent;
use App\Models\User;
use App\Services\Assistant;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia;

test('the matching profile is saved by hand on the agency and on the agent, and shown on their pages', function (): void {
    $user = User::factory()->create();
    $agency = Agency::factory()->create();
    $agent = Agent::factory()->forAgency($agency)->create();

    $this->actingAs($user)
        ->patch(route('agencies.profile', $agency), [
            'districts' => [11, 3, 11],
            'specialties' => ['furnished', 'expats'],
            'languages' => ['en'],
            'mandate_types' => ['rental'],
            'fee_note' => '12 €/m²',
            'rent_min_cents' => 300_000,
            'rent_max_cents' => 120_000,
            'accepts_garantme' => true,
            'accepts_foreign_files' => null,
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $agency->refresh();
    expect($agency->districts)->toBe([3, 11])
        ->and($agency->specialties->all())->toBe([AgencySpecialty::Furnished, AgencySpecialty::Expats])
        ->and($agency->languages->all())->toBe([SpokenLanguage::English])
        // Bornes inversées remises dans l'ordre.
        ->and($agency->rent_min_cents)->toBe(120_000)
        ->and($agency->rent_max_cents)->toBe(300_000)
        ->and($agency->accepts_garantme)->toBeTrue()
        ->and($agency->accepts_foreign_files)->toBeNull()
        ->and($agency->hasProfile())->toBeTrue();

    $this->actingAs($user)
        ->patch(route('agents.profile', $agent), ['districts' => [20], 'languages' => ['es']])
        ->assertRedirect()
        ->assertSessionHasNoErrors();
    expect($agent->fresh()->districts)->toBe([20])
        ->and($agent->fresh()->languages->all())->toBe([SpokenLanguage::Spanish]);

    $this->actingAs($user)->get(route('agencies.show', $agency))->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('agency.districts', [3, 11])
            ->where('agency.specialty_labels', ['Meublé', 'Expatriés'])
            ->where('agency.has_profile', true)
            ->has('profileOptions.specialties'));
    $this->actingAs($user)->get(route('agents.show', $agent))->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('agent.districts', [20])
            ->where('agent.language_labels', ['Espagnol']));

    $this->actingAs($user)->patch(route('agencies.profile', $agency), ['districts' => [42]])->assertSessionHasErrors('districts.0');
});

test('the assistant reads the website and proposes a profile, which the team applies onto empty fields only or dismisses', function (): void {
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

            return [
                'summary' => 'Agence de quartier spécialisée dans le meublé pour expatriés.',
                'districts' => [11, 20, 42],
                'specialties' => ['furnished', 'expats', 'bogus'],
                'languages' => ['en'],
                'mandate_types' => ['rental'],
                'fee_note' => 'Un mois de loyer',
                'rent_min_eur' => 900,
                'rent_max_eur' => 2500,
                'accepts_garantme' => true,
                'accepts_foreign_files' => null,
                'notes' => 'Dossier complet exigé avant toute visite.',
            ];
        }
    };
    app()->instance(Assistant::class, $assistant);
    Http::fake([
        'https://oberkampf.example' => Http::response('<html><body><a href="/honoraires">Honoraires</a><a href="https://ailleurs.example/x">x</a><p>Agence du 11e, meublé, expatriés bienvenus.</p></body></html>'),
        'https://oberkampf.example/honoraires' => Http::response('<html><body>Un mois de loyer.</body></html>'),
    ]);
    $user = User::factory()->create();
    $agency = Agency::factory()->create(['name' => 'Oberkampf Immo', 'website' => 'https://oberkampf.example', 'districts' => [11], 'notes' => 'Notes de l’équipe.']);

    $this->actingAs($user)->post(route('agencies.enrich', $agency))->assertRedirect()->assertSessionHasNoErrors();

    $agency->refresh();
    expect($assistant->lastPrompt)->toContain('Site : accueil')->toContain('expatriés bienvenus')->toContain('Un mois de loyer.')
        ->and($agency->ai_profile['districts'])->toBe([11, 20])
        ->and($agency->ai_profile['specialties'])->toBe(['furnished', 'expats'])
        ->and($agency->ai_profile['rent_min_cents'])->toBe(90_000)
        ->and($agency->ai_profile_at)->not->toBeNull()
        // Rien n'est écrit sur le profil tant que l'équipe n'a pas appliqué.
        ->and($agency->specialties)->toBeNull();

    $this->actingAs($user)->post(route('agencies.enrich.apply', $agency))->assertRedirect();
    $agency->refresh();
    expect($agency->districts)->toBe([11])
        ->and($agency->specialties->all())->toBe([AgencySpecialty::Furnished, AgencySpecialty::Expats])
        ->and($agency->fee_note)->toBe('Un mois de loyer')
        ->and($agency->rent_max_cents)->toBe(250_000)
        ->and($agency->accepts_garantme)->toBeTrue()
        ->and($agency->notes)->toBe("Notes de l’équipe.\n\nDossier complet exigé avant toute visite.")
        ->and($agency->ai_profile)->toBeNull();

    // Une nouvelle lecture, écartée : rien ne bouge.
    $this->actingAs($user)->post(route('agencies.enrich', $agency))->assertRedirect();
    expect($agency->fresh()->ai_profile)->not->toBeNull();
    $this->actingAs($user)->delete(route('agencies.enrich.dismiss', $agency))->assertRedirect();
    expect($agency->fresh()->ai_profile)->toBeNull()
        ->and($agency->fresh()->fee_note)->toBe('Un mois de loyer');
});

test('without a website there is nothing to read, and the page says so', function (): void {
    app()->instance(Assistant::class, new class extends Assistant
    {
        public function __construct()
        {
            parent::__construct(key: 'test-key', model: 'claude-opus-5');
        }
    });
    $agency = Agency::factory()->create(['website' => null]);

    $this->actingAs(User::factory()->create())
        ->from(route('agencies.show', $agency))
        ->post(route('agencies.enrich', $agency))
        ->assertRedirect(route('agencies.show', $agency));

    expect($agency->fresh()->ai_profile)->toBeNull();
});

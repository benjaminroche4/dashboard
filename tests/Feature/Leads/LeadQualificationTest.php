<?php

declare(strict_types=1);

use Anthropic\Messages\OutputConfig\Effort;
use App\Actions\Leads\CreateLead;
use App\Actions\Leads\QualifyLead;
use App\Data\LeadData;
use App\Data\LeadQualificationData;
use App\Enums\Furnished;
use App\Enums\LeadDuration;
use App\Enums\LeadLanguage;
use App\Enums\LeadSource;
use App\Enums\PropertyType;
use App\Events\DashboardUpdated;
use App\Jobs\QualifyLeadJob;
use App\Models\Lead;
use App\Models\User;
use App\Services\Assistant;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Queue;
use Inertia\Testing\AssertableInertia;

beforeEach(fn () => Event::fake([DashboardUpdated::class]));

/** Assistant simulé : réponse préparée, prompt mémorisé, ou non configuré. */
function qualificationAssistant(array $reply, bool $configured = true): Assistant
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

        public function extract(string $system, string $prompt, array $schema, int $maxTokens = 8000, Effort $effort = Effort::LOW): array
        {
            $this->lastPrompt = $prompt;

            return $this->reply;
        }
    };
}

$reply = [
    'summary' => 'Cadre muté de Genève, cherche un T3 meublé dans le Marais pour septembre.',
    'company' => 'Nestlé',
    'language' => 'en',
    'budget' => 2500,
    'currency' => 'EUR',
    'arrival_at' => '2026-10-01',
    'districts' => [3, 4, 4, 25],
    'property_types' => ['t3', 'villa'],
    'furnished' => 'furnished',
    'duration' => 'long',
    'guarantors' => ['garantme'],
    'origin_city' => 'Genève',
    'score' => 4,
    'score_reason' => 'Projet précis et budget réaliste.',
];

test('the assistant reply is normalised and only the fields the lead lacks are proposed', function () use ($reply): void {
    $data = LeadQualificationData::from($reply);

    expect($data->budgetCents)->toBe(250_000)
        ->and($data->districts)->toBe([3, 4])
        ->and($data->propertyTypes)->toBe([PropertyType::T3])
        ->and($data->language)->toBe(LeadLanguage::English)
        ->and($data->duration)->toBe(LeadDuration::Long)
        ->and($data->arrivalAt?->toDateString())->toBe('2026-10-01')
        ->and(LeadQualificationData::from($data->toArray())->budgetCents)->toBe(250_000);

    $lead = Lead::factory()->create(['budget_cents' => 200_000, 'districts' => [], 'property_types' => [], 'furnished' => null, 'company' => null, 'language' => LeadLanguage::French, 'origin_city' => 'Lyon', 'score' => null, 'duration' => null, 'guarantors' => [], 'arrival_at' => null]);
    $proposals = $data->proposals($lead);

    expect(array_column($proposals, 'key'))->toBe(['company', 'language', 'arrival_at', 'districts', 'property_types', 'furnished', 'duration', 'guarantors', 'score'])
        ->and(collect($proposals)->firstWhere('key', 'districts')['value'])->toBe('3e, 4e')
        ->and(collect($proposals)->firstWhere('key', 'score')['value'])->toBe('4 / 5 · Projet précis et budget réaliste.')
        ->and($data->attributes(['districts', 'budget_cents', 'unknown']))->toMatchArray(['districts' => [3, 4], 'budget_cents' => 250_000])
        ->and($data->attributes(['budget_cents'])['currency']->value)->toBe('EUR');
});

test('qualifying a website lead stores the proposal, broadcasts it to the assignee and the page exposes it', function () use ($reply): void {
    $advisor = User::factory()->create();
    $lead = Lead::factory()->create(['source' => LeadSource::Website, 'source_note' => 'Formulaire de contact · Recherche de logement · CT-1', 'message' => 'Hi, I am moving from Geneva in October with Nestlé, looking for a furnished 2-bedroom in the Marais, budget 2500.', 'assigned_to' => $advisor->id, 'language' => LeadLanguage::French, 'company' => null, 'budget_cents' => null, 'districts' => [], 'property_types' => [], 'furnished' => null, 'score' => null, 'arrival_at' => null, 'duration' => null, 'guarantors' => [], 'origin_city' => null]);
    $assistant = qualificationAssistant($reply);
    app()->instance(Assistant::class, $assistant);

    $this->actingAs(User::factory()->create())
        ->post(route('leads.qualify', $lead))
        ->assertRedirect();

    expect($assistant->lastPrompt)->toContain('moving from Geneva')->toContain("Déjà connu par l'équipe")
        ->and($lead->refresh()->ai_qualification['budget_cents'])->toBe(250_000)
        ->and($lead->ai_qualified_at)->not->toBeNull();
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => str_starts_with((string) $event->message, "L'assistant a qualifié le lead") && ($event->payload['mentions'] ?? []) === [$advisor->id]);

    $this->actingAs($advisor)
        ->get(route('leads.show', $lead))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('qualification.summary', $reply['summary'])
            ->where('qualification.score', 4)
            ->has('qualification.fields', 11)
            ->where('qualification.fields.0.key', 'company')
            ->where('qualification.fields.0.value', 'Nestlé'));

    $this->actingAs($advisor)
        ->get(route('leads.index'))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page->where('leads.0.ai_pending', true));
});

test('the proposal is applied to empty fields only, noted, then cleared; a dismissal clears it too', function () use ($reply): void {
    $member = User::factory()->create();
    $lead = Lead::factory()->create(['budget_cents' => 200_000, 'company' => null, 'districts' => [], 'furnished' => Furnished::Unfurnished, 'score' => null, 'qualification_note' => null, 'ai_qualification' => LeadQualificationData::from($reply)->toArray(), 'ai_qualified_at' => now()]);

    $this->actingAs($member)
        ->post(route('leads.qualification.apply', $lead), ['fields' => ['company', 'districts', 'score', 'budget_cents', 'furnished', 'bogus']])
        ->assertSessionHasErrors(['fields.5']);

    $this->actingAs($member)
        ->post(route('leads.qualification.apply', $lead), ['fields' => ['company', 'districts', 'score', 'budget_cents', 'furnished']])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $lead->refresh();
    expect($lead->company)->toBe('Nestlé')
        ->and($lead->districts)->toBe([3, 4])
        ->and($lead->score)->toBe(4)
        ->and($lead->budget_cents)->toBe(200_000) // déjà renseigné : jamais écrasé
        ->and($lead->furnished)->toBe(Furnished::Unfurnished)
        ->and($lead->qualification_note)->toContain($reply['summary'])->toContain('Projet précis')
        ->and($lead->ai_qualification)->toBeNull()
        ->and($lead->notes()->latest()->value('body'))->toBe('Qualification IA appliquée : Société, Arrondissements, Note.');
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => str_contains((string) $event->message, 'a appliqué la qualification IA'));

    $other = Lead::factory()->create(['ai_qualification' => LeadQualificationData::from($reply)->toArray(), 'ai_qualified_at' => now()]);
    $this->actingAs($member)->delete(route('leads.qualification.dismiss', $other))->assertRedirect();
    expect($other->refresh()->ai_qualification)->toBeNull();
});

test('without an assistant nothing is proposed, and an inbound lead queues a qualification job only when a key is set', function (): void {
    app()->instance(Assistant::class, qualificationAssistant([], configured: false));
    $lead = Lead::factory()->create(['message' => 'Je cherche un studio.']);

    expect(resolve(QualifyLead::class)->handle($lead))->toBeNull()
        ->and(QualifyLead::prompt(Lead::factory()->create(['message' => null, 'source' => LeadSource::Referral])))->toBeNull();

    Queue::fake();
    config()->set('services.anthropic.key', 'test-key');
    $this->postJson(route('webhooks.rip.contact'), []); // sans signature : refusé, aucun job
    Queue::assertNothingPushed();

    $created = resolve(CreateLead::class)->handle(LeadData::from(['first_name' => 'Léa', 'last_name' => 'Durand', 'email' => 'lea@example.com', 'source' => 'website', 'message' => 'Studio Marais.']));
    Queue::assertPushed(QualifyLeadJob::class, fn (QualifyLeadJob $job): bool => $job->lead->is($created));

    config()->set('services.anthropic.key');
    resolve(CreateLead::class)->handle(LeadData::from(['first_name' => 'Paul', 'last_name' => 'Roux', 'email' => 'paul@example.com', 'source' => 'website']));
    Queue::assertPushed(QualifyLeadJob::class, 1);
});

<?php

declare(strict_types=1);

use Anthropic\Messages\OutputConfig\Effort;
use App\Actions\Leads\CreateLead;
use App\Actions\Leads\QualifyLead;
use App\Data\LeadData;
use App\Data\LeadVerdictData;
use App\Enums\LeadSource;
use App\Enums\LeadVerdict;
use App\Events\DashboardUpdated;
use App\Jobs\QualifyLeadJob;
use App\Models\Lead;
use App\Models\LeadNote;
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

$reply = ['verdict' => 'qualified', 'reason' => 'Projet précis, budget réaliste et arrivée proche.'];

test('the assistant reply is normalised: an unknown verdict is neutral, the reason is trimmed', function (): void {
    expect(LeadVerdictData::from(['verdict' => 'qualified', 'reason' => '  Budget tenable.  '])->reason)->toBe('Budget tenable.')
        ->and(LeadVerdictData::from(['verdict' => 'whatever', 'reason' => ''])->verdict)->toBe(LeadVerdict::Neutral)
        ->and(LeadVerdictData::from(['verdict' => 'whatever', 'reason' => ''])->reason)->toBeNull()
        ->and(LeadVerdictData::from(['verdict' => 'not_qualified', 'reason' => str_repeat('a', 400)])->reason)->toHaveLength(300);
});

test('analysing a lead stores the verdict, broadcasts it to the assignee and the pages expose it', function () use ($reply): void {
    $advisor = User::factory()->create();
    $lead = Lead::factory()->create(['source' => LeadSource::Website, 'message' => 'Hi, I am moving from Geneva in October with Nestlé, looking for a furnished 2-bedroom in the Marais, budget 2500.', 'assigned_to' => $advisor->id, 'company' => 'Nestlé', 'budget_cents' => 250_000]);
    $assistant = qualificationAssistant($reply);
    app()->instance(Assistant::class, $assistant);

    $this->actingAs(User::factory()->create())
        ->post(route('leads.qualify', $lead))
        ->assertRedirect();

    // Tout ce que le lead porte part dans le prompt : le message et ce que l'équipe sait déjà.
    expect($assistant->lastPrompt)->toContain('moving from Geneva')->toContain("Déjà connu par l'équipe")->toContain('Nestlé')
        ->and($lead->refresh()->ai_verdict)->toBe(LeadVerdict::Qualified)
        ->and($lead->ai_verdict_reason)->toBe('Projet précis, budget réaliste et arrivée proche.')
        ->and($lead->ai_verdict_at)->not->toBeNull();
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->message === "L'assistant a évalué le lead {$lead->fullName()} : qualifié" && ($event->payload['mentions'] ?? []) === [$advisor->id]);

    $this->actingAs($advisor)
        ->get(route('leads.show', $lead))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('verdict.value', 'qualified')
            ->where('verdict.label', 'Qualifié')
            ->where('verdict.reason', 'Projet précis, budget réaliste et arrivée proche.')
            ->missing('qualification'));

    $this->actingAs($advisor)
        ->get(route('leads.index'))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page->where('leads.0.ai_verdict', 'qualified')->where('leads.0.ai_verdict_label', 'Qualifié'));
});

test('a neutral verdict is stored and labelled « À vérifier »', function (): void {
    $lead = Lead::factory()->create(['message' => 'Bonjour.']);
    app()->instance(Assistant::class, qualificationAssistant(['verdict' => 'neutral', 'reason' => 'Message trop court pour juger.']));

    resolve(QualifyLead::class)->handle($lead);

    expect($lead->refresh()->ai_verdict)->toBe(LeadVerdict::Neutral)
        ->and($lead->ai_verdict?->label())->toBe('À vérifier');
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => str_ends_with((string) $event->message, ': à vérifier'));
});

test('without an assistant nothing is said, and every new lead queues an analysis only when a key is set', function (): void {
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
    // Un lead saisi par l'équipe est évalué lui aussi.
    $typed = resolve(CreateLead::class)->handle(LeadData::from(['first_name' => 'Marc', 'last_name' => 'Petit', 'email' => 'marc@example.com', 'source' => 'referral']), User::factory()->create());
    Queue::assertPushed(QualifyLeadJob::class, fn (QualifyLeadJob $job): bool => $job->lead->is($typed));

    config()->set('services.anthropic.key');
    resolve(CreateLead::class)->handle(LeadData::from(['first_name' => 'Paul', 'last_name' => 'Roux', 'email' => 'paul@example.com', 'source' => 'website']));
    Queue::assertPushed(QualifyLeadJob::class, 2);
});

it('reads the ten most recent notes of the team and of the phone, never the tracking', function (): void {
    $lead = Lead::factory()->create();
    $day = now()->subDays(30);
    // Onze notes d'équipe : la plus ancienne doit sortir, la plus récente rester.
    foreach (range(1, 11) as $i) {
        LeadNote::factory()->for($lead)->create(['body' => "Note équipe {$i}", 'created_at' => $day->copy()->addDays($i)]);
    }
    LeadNote::factory()->for($lead)->tracking()->create(['body' => 'Facture RP-27001 rattachée à ce lead.', 'created_at' => now()]);
    LeadNote::factory()->for($lead)->tracking()->create(['body' => 'Appel entrant (3 min, répondu) : cherche un T2 dans le 11e', 'created_at' => now()]);

    $prompt = (string) QualifyLead::prompt($lead->refresh());

    expect($prompt)->toContain("- Note équipe 11\n")->toContain("- Note équipe 3\n")
        ->not->toContain("- Note équipe 2\n")
        ->toContain('cherche un T2 dans le 11e')
        ->not->toContain('Facture RP-27001');
});

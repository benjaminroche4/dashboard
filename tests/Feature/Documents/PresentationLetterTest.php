<?php

declare(strict_types=1);

use Anthropic\Messages\OutputConfig\Effort;
use App\Actions\Documents\DraftPresentationLetter;
use App\Actions\Documents\RenderDossierCover;
use App\Enums\HouseholdRole;
use App\Events\DashboardUpdated;
use App\Models\DocumentRequest;
use App\Models\Lead;
use App\Models\LeadGuarantor;
use App\Models\User;
use App\Services\Assistant;
use Illuminate\Support\Facades\Event;

beforeEach(fn () => Event::fake([DashboardUpdated::class]));

function letterAssistant(array $reply): Assistant
{
    return new class($reply) extends Assistant
    {
        public string $lastPrompt = '';

        public function __construct(private readonly array $reply)
        {
            parent::__construct(key: 'test-key', model: 'claude-opus-5');
        }

        public function extract(string $system, string $prompt, array $schema, int $maxTokens = 8000, Effort $effort = Effort::LOW): array
        {
            $this->lastPrompt = $prompt;

            return $this->reply;
        }
    };
}

/** Une liste rattachée à un dossier client renseigné : projet, fiche, garant. */
function dossierRequest(): DocumentRequest
{
    $lead = Lead::factory()->converted()->create([
        'first_name' => 'Léa',
        'last_name' => 'Durand',
        'budget_cents' => 250_000,
        'districts' => [11, 3],
        'company' => 'Nestlé',
        'tenant_profiles' => ['primary' => ['employment_status' => 'cdi', 'employer' => 'Nestlé', 'income_cents' => 820_000]],
    ]);
    LeadGuarantor::factory()->for($lead)->create(['first_name' => 'Marc', 'last_name' => 'Durand', 'occupation' => 'Notaire', 'income_cents' => 900_000]);

    return DocumentRequest::factory()->for($lead)->create([
        'persons' => [['first_name' => 'Léa', 'last_name' => 'Durand', 'role' => HouseholdRole::Tenant->value, 'documents' => []]],
    ]);
}

it('tells the assistant everything the agency knows about the household, without contact details', function (): void {
    $request = dossierRequest();
    $assistant = letterAssistant(['letter' => 'Nous avons le plaisir…']);
    app()->instance(Assistant::class, $assistant);

    $letter = resolve(DraftPresentationLetter::class)->handle($request);

    expect($letter)->toBe('Nous avons le plaisir…')
        ->and($assistant->lastPrompt)
        ->toContain('Léa Durand, Locataire : CDI, chez Nestlé, 8 200 € nets par mois')
        ->toContain('2 500 EUR')->toContain('11e, 3e')
        ->toContain('Garant : Marc Durand (Notaire, 9 000 € nets par mois)')
        ->not->toContain('@');
});

it('saves the letter the team reviewed and prints it at the top of the merged dossier', function (): void {
    $request = dossierRequest();
    $member = User::factory()->staff()->create();

    $this->actingAs($member)
        ->patch(route('tools.documents.letter', $request), ['letter' => "Nous présentons le dossier de Léa.\n\nSalariée en CDI."])
        ->assertRedirect();

    expect($request->refresh()->presentation_letter)->toStartWith('Nous présentons le dossier de Léa.');
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => str_contains((string) $event->message, 'a enregistré la lettre de présentation'));

    $html = resolve(RenderDossierCover::class)->html($request);
    expect($html)->toContain('Présentation du dossier')->toContain('Nous présentons le dossier de Léa.<br');

    // Vide : la lettre est retirée, et la page de garde ne la mentionne plus.
    $this->actingAs($member)->patch(route('tools.documents.letter', $request), ['letter' => ''])->assertRedirect();
    expect($request->refresh()->presentation_letter)->toBeNull()
        ->and(resolve(RenderDossierCover::class)->html($request))->not->toContain('Présentation du dossier');
});

it('answers the drafted letter as JSON and refuses without the assistant', function (): void {
    $request = dossierRequest();
    $member = User::factory()->staff()->create();
    app()->instance(Assistant::class, letterAssistant(['letter' => 'Bonjour.']));

    $this->actingAs($member)
        ->postJson(route('tools.documents.letter.draft', $request))
        ->assertOk()
        ->assertJsonPath('letter', 'Bonjour.');
});

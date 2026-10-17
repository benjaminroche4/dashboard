<?php

declare(strict_types=1);

use Anthropic\Messages\OutputConfig\Effort;
use App\Actions\Documents\GenerateDossierBrief;
use App\Actions\Documents\RenderDossierCover;
use App\Actions\Documents\RenderDossierSectionSheet;
use App\Data\DossierBriefData;
use App\Enums\DocumentUploadStatus;
use App\Events\DashboardUpdated;
use App\Jobs\GenerateDossierBriefJob;
use App\Models\DocumentRequest;
use App\Models\DocumentUpload;
use App\Models\Lead;
use App\Models\User;
use App\Services\Assistant;
use App\Support\DossierPlan;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;

beforeEach(fn () => Event::fake([DashboardUpdated::class]));

/** Assistant simulé : une réponse par partie lue, puis la page de garde. */
function briefAssistant(array $sectionReply, array $coverReply, bool $configured = true): Assistant
{
    return new class($sectionReply, $coverReply, $configured) extends Assistant
    {
        /** @var list<array{prompt: string, pdfs: int}> */
        public array $sectionCalls = [];

        public string $coverPrompt = '';

        public string $sectionSystem = '';

        public string $coverSystem = '';

        /** L'avancement tel que la page le lirait au moment de la page de garde. */
        public mixed $progressAtCover = null;

        public function __construct(private readonly array $sectionReply, private readonly array $coverReply, private readonly bool $configured)
        {
            parent::__construct(key: $configured ? 'test-key' : null, model: 'claude-opus-5');
        }

        public function isConfigured(): bool
        {
            return $this->configured;
        }

        public function extractFromPdf(string $system, string $prompt, array $schema, array $pdfs, int $maxTokens = 8000, Effort $effort = Effort::LOW): array
        {
            $this->sectionCalls[] = ['prompt' => $prompt, 'pdfs' => count($pdfs)];
            $this->sectionSystem = $system;

            throw_if(str_contains($prompt, 'Épargne et banque'), RuntimeException::class, 'Assistant IA injoignable.');

            return $this->sectionReply;
        }

        public function extract(string $system, string $prompt, array $schema, int $maxTokens = 8000, Effort $effort = Effort::LOW): array
        {
            $this->coverPrompt = $prompt;
            $this->coverSystem = $system;
            $this->progressAtCover = DocumentRequest::query()->whereNotNull('dossier_brief_progress')->first()?->dossier_brief_progress;

            return $this->coverReply;
        }
    };
}

/**
 * Dossier complet : un locataire avec trois pièces validées (identité, deux
 * bulletins, RIB) et un garant avec sa pièce d'identité validée.
 */
function completeDossier(): DocumentRequest
{
    Storage::fake(DocumentUpload::DISK);

    $lead = Lead::factory()->converted()->create(['first_name' => 'Léa', 'last_name' => 'Durand', 'budget_cents' => 180_000]);
    $request = DocumentRequest::factory()->for($lead)->create([
        'first_name' => 'Léa',
        'last_name' => 'Durand',
        'persons' => [
            ['first_name' => 'Léa', 'last_name' => 'Durand', 'role' => 'tenant', 'documents' => ['identity_document', 'rib', 'payslips']],
            ['first_name' => 'Marc', 'last_name' => 'Durand', 'role' => 'guarantor', 'documents' => ['identity_document']],
        ],
    ]);

    foreach ([[0, 'identity_document', 'cni.pdf'], [0, 'payslips', 'paie-juin.pdf'], [0, 'payslips', 'paie-juillet.pdf'], [0, 'rib', 'rib.pdf'], [1, 'identity_document', 'cni-marc.pdf']] as [$person, $key, $name]) {
        $upload = DocumentUpload::factory()->for($request, 'request')->reviewed(DocumentUploadStatus::Accepted)->create([
            'person_index' => $person,
            'document_key' => $key,
            'original_name' => $name,
        ]);
        Storage::disk(DocumentUpload::DISK)->put($upload->path, "%PDF-1.4 {$name}");
    }

    return $request->refresh()->load('uploads');
}

$sectionReply = [
    'title' => 'Revenus : 4 150 € nets par mois',
    'summary' => 'Deux bulletins de juin et juillet 2026, salaire stable.',
    'facts' => [['label' => 'Net mensuel moyen', 'value' => '4 150 €'], ['label' => 'Période', 'value' => 'juin à juillet 2026']],
    'documents' => [['label' => 'paie-juin.pdf', 'note' => 'Juin 2026 : 4 100 €'], ['label' => 'invente.pdf', 'note' => 'Un fichier qui n’existe pas']],
];
$coverReply = [
    'summary' => "Nous présentons le dossier de Léa Durand.\n\nSes revenus couvrent trois fois le loyer visé.",
    'figures' => [
        'salary' => ['value' => '4 150 € nets / mois', 'detail' => 'CDI, moyenne juin-juillet 2026', 'breakdown' => []],
        'taxes' => ['value' => null, 'detail' => null, 'breakdown' => [['label' => 'Léa Durand', 'value' => 'Avis absent']]],
        // Carte oubliée par l'assistant : elle existe quand même, vide.
    ],
    'highlights' => ['Revenus : 4 150 € nets par mois', 'Taux d’effort : 43 %'],
];

test('the plan orders the parts of a complete dossier and fingerprints its validated files', function (): void {
    $request = completeDossier();

    expect(DossierPlan::isComplete($request))->toBeTrue()
        ->and(DossierPlan::missingCount($request))->toBe(0)
        ->and(array_column(DossierPlan::sections($request), 'key'))->toBe(['0-identity', '0-income', '0-savings', '1-identity'])
        ->and(DossierPlan::section($request, '0-income')['documents'][0]['uploads'])->toHaveCount(2)
        ->and(DossierPlan::section($request, '9-income'))->toBeNull();

    $before = DossierPlan::fingerprint($request);

    // Remettre une pièce en vérification change l'empreinte : la synthèse serait périmée.
    $request->uploads->first()->forceFill(['status' => DocumentUploadStatus::Pending])->save();
    $request->refresh()->load('uploads');

    expect(DossierPlan::fingerprint($request))->not->toBe($before)
        ->and(DossierPlan::isComplete($request))->toBeFalse()
        ->and(DossierPlan::missingCount($request))->toBe(1);
});

test('the assistant writes one sheet per part on its files, then the cover from the sheets and the project', function () use ($sectionReply, $coverReply): void {
    $request = completeDossier();
    $assistant = briefAssistant($sectionReply, $coverReply);
    app()->instance(Assistant::class, $assistant);

    $brief = resolve(GenerateDossierBrief::class)->handle($request);

    // Quatre parties, chacune lue avec **tous** ses fichiers (les deux bulletins ensemble).
    expect($assistant->sectionCalls)->toHaveCount(4)
        ->and($assistant->sectionCalls[1]['prompt'])->toContain('Revenus et salaires')->toContain('Léa Durand (Locataire)')->toContain('1. 3 derniers bulletins de salaire, fichier « paie-juin.pdf »')->toContain('2. 3 derniers bulletins de salaire, fichier « paie-juillet.pdf »')
        ->and($assistant->sectionCalls[1]['pdfs'])->toBe(2)
        ->and($assistant->sectionCalls[3]['prompt'])->toContain('Marc Durand (Garant)');

    // La page de garde est rédigée d'après les fiches et le projet du lead.
    expect($assistant->coverPrompt)->toContain('## Revenus et salaires : Léa Durand (Locataire)')->toContain('Net mensuel moyen : 4 150 €')->toContain('1 800 EUR')
        ->and($brief->cover['summary'])->toContain('Nous présentons le dossier')
        ->and($brief->cover['highlights'])->toBe(['Revenus : 4 150 € nets par mois', 'Taux d’effort : 43 %'])
        // Les trois cartes sont toujours là, même celle que l'assistant a oubliée.
        ->and(array_keys($brief->cover['figures']))->toBe(['salary', 'taxes', 'savings'])
        ->and($brief->cover['figures']['salary']['value'])->toBe('4 150 € nets / mois')
        ->and($brief->cover['figures']['taxes']['breakdown'][0]['label'])->toBe('Léa Durand')
        ->and($brief->cover['figures']['savings'])->toBe(['value' => null, 'detail' => null, 'breakdown' => []]);

    $income = $brief->section('0-income');
    expect($income['title'])->toBe('Revenus : 4 150 € nets par mois')
        ->and($income['facts'])->toHaveCount(2)
        // Une note par fichier **du plan**, dans l'ordre ; le fichier inventé est ignoré.
        ->and(array_column($income['documents'], 'label'))->toBe(['paie-juin.pdf', 'paie-juillet.pdf'])
        ->and($income['documents'][0]['note'])->toBe('Juin 2026 : 4 100 €')
        ->and($income['documents'][1]['note'])->toBeNull();

    // La partie que l'assistant n'a pas su lire garde sa fiche, sans résumé.
    $savings = $brief->section('0-savings');
    expect($savings['summary'])->toBeNull()
        ->and($savings['title'])->toBe('Épargne et banque')
        ->and(array_column($savings['documents'], 'label'))->toBe(['rib.pdf']);

    $request->refresh();
    expect($request->dossier_brief_at)->not->toBeNull()
        ->and($request->dossier_brief_fingerprint)->toBe(DossierPlan::fingerprint($request->load('uploads')))
        ->and($request->dossier_brief_requested_at)->toBeNull()
        ->and(RenderDossierSectionSheet::isFresh($request))->toBeTrue()
        ->and(DossierBriefData::from($request->dossier_brief)->sections)->toHaveCount(4);

    // Les deux consignes partagent la forme des valeurs : arrondi à l'euro supérieur, dates en lettres.
    foreach ([$assistant->sectionSystem, $assistant->coverSystem] as $system) {
        expect($system)->toContain('arrondis à l\'euro supérieur')->toContain('de juin à août 2026')->toContain('RFR 2025 : 29 400 €');
    }

    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->resource === 'documents'
        && str_contains((string) $event->message, 'a préparé le dossier de Léa Durand')
        && str_contains((string) $event->message, '(4 fiches)'));

    // Pendant la page de garde, toutes les parties étaient lues ; une fois écrite, l'avancement s'efface.
    expect($assistant->progressAtCover['done'])->toBe(4)
        ->and($assistant->progressAtCover['total'])->toBe(5)
        ->and(array_column($assistant->progressAtCover['steps'], 'state'))->toBe(['done', 'done', 'done', 'done', 'reading'])
        ->and($request->refresh()->dossier_brief_progress)->toBeNull();
});

test('an incomplete dossier is prepared on its validated pieces, and the cover prompt names what is missing', function () use ($sectionReply, $coverReply): void {
    $request = completeDossier();
    $request->uploads->firstWhere('original_name', 'rib.pdf')->forceFill(['status' => DocumentUploadStatus::Refused])->save();
    $assistant = briefAssistant($sectionReply, $coverReply);
    app()->instance(Assistant::class, $assistant);

    resolve(GenerateDossierBrief::class)->handle($request->refresh());

    // Trois parties lues (le RIB refusé n'en fait plus une), la page de garde sait ce qui manque.
    expect(DossierBriefData::from($request->refresh()->dossier_brief)->sections)->toHaveCount(3)
        ->and(DossierPlan::missingLabels($request->load('uploads')))->toBe(['Léa Durand (Locataire) : RIB'])
        ->and($assistant->coverPrompt)->toContain('Pièces encore attendues')->toContain('Léa Durand (Locataire) : RIB');
});

test('an update rereads only the parts whose files changed, and retries a part left unread', function () use ($sectionReply, $coverReply): void {
    $request = completeDossier();
    $first = briefAssistant($sectionReply, $coverReply);
    app()->instance(Assistant::class, $first);
    resolve(GenerateDossierBrief::class)->handle($request);

    // Quatre parties lues ; l'épargne a échoué (doublure) et reste sans résumé.
    expect($first->sectionCalls)->toHaveCount(4)
        ->and(DossierBriefData::from($request->refresh()->dossier_brief)->section('0-savings')['summary'])->toBeNull()
        ->and(DossierBriefData::from($request->dossier_brief)->section('0-income')['fingerprint'])->not->toBeNull();

    // Un bulletin de plus dans les revenus : seules cette partie et la partie
    // restée sans résumé sont relues ; identité et garant gardent leur fiche.
    $added = DocumentUpload::factory()->for($request, 'request')->reviewed(DocumentUploadStatus::Accepted)->create([
        'person_index' => 0,
        'document_key' => 'payslips',
        'original_name' => 'paie-aout.pdf',
    ]);
    Storage::disk(DocumentUpload::DISK)->put($added->path, '%PDF-1.4 aout');

    $second = briefAssistant($sectionReply, $coverReply);
    app()->instance(Assistant::class, $second);
    resolve(GenerateDossierBrief::class)->handle($request->refresh()->load('uploads'));

    expect(array_map(fn (array $call): bool => str_contains($call['prompt'], 'Revenus et salaires') || str_contains($call['prompt'], 'Épargne et banque'), $second->sectionCalls))->toBe([true, true])
        ->and($second->coverPrompt)->not->toBe('')
        ->and(RenderDossierSectionSheet::isFresh($request->refresh()->load('uploads')))->toBeTrue();

    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => str_contains((string) $event->message, 'a mis à jour le dossier de Léa Durand (2 fiches relues sur 4)')
        && ($event->payload['brief_ready'] ?? false) === true);

    // Forcée : les quatre parties sont relues, même inchangées.
    $third = briefAssistant($sectionReply, $coverReply);
    app()->instance(Assistant::class, $third);
    resolve(GenerateDossierBrief::class)->handle($request->refresh()->load('uploads'), force: true);
    expect($third->sectionCalls)->toHaveCount(4);
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => str_contains((string) $event->message, '4 fiches relues sur 4'));
});

test('the brief route passes the force flag to the job', function () use ($sectionReply, $coverReply): void {
    Queue::fake();
    $request = completeDossier();
    app()->instance(Assistant::class, briefAssistant($sectionReply, $coverReply));

    $this->actingAs(User::factory()->create())->post(route('tools.documents.brief', $request), ['force' => true])->assertRedirect();

    Queue::assertPushed(GenerateDossierBriefJob::class, fn (GenerateDossierBriefJob $job): bool => $job->force);
});

test('the dossier is not prepared while nothing at all is validated', function () use ($sectionReply, $coverReply): void {
    $request = completeDossier();
    $request->uploads->each(fn (DocumentUpload $upload) => $upload->forceFill(['status' => DocumentUploadStatus::Pending])->save());
    app()->instance(Assistant::class, briefAssistant($sectionReply, $coverReply));

    expect(fn () => resolve(GenerateDossierBrief::class)->handle($request->refresh()))
        ->toThrow(RuntimeException::class, 'Aucune pièce validée');
});

test('the brief route queues the job, dates the request and refuses a dossier without any validated piece', function () use ($sectionReply, $coverReply): void {
    Queue::fake();
    $request = completeDossier();
    $staff = User::factory()->create();
    app()->instance(Assistant::class, briefAssistant($sectionReply, $coverReply));

    $this->actingAs($staff)->post(route('tools.documents.brief', $request))->assertRedirect();

    Queue::assertPushed(GenerateDossierBriefJob::class, fn (GenerateDossierBriefJob $job): bool => $job->request->is($request));
    expect($request->refresh()->dossier_brief_requested_at)->not->toBeNull();

    // La page le dit : en cours, pas encore de synthèse.
    $this->actingAs($staff)->get(route('tools.documents.show', $request))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('request.is_complete', true)
            ->where('request.missing_count', 0)
            ->where('request.brief.pending', true)
            ->where('request.brief.cover', null)
            ->where('request.persons.0.categories.0.documents.0.section', 'savings'));

    // Plus rien de validé : refus avec un toast, rien n'est mis en file.
    $request->uploads()->update(['status' => DocumentUploadStatus::Pending->value]);
    $this->actingAs($staff)->post(route('tools.documents.brief', $request->refresh()))->assertRedirect();
    Queue::assertPushed(GenerateDossierBriefJob::class, 1);

    // Sans clé, même refus lisible.
    app()->instance(Assistant::class, briefAssistant($sectionReply, $coverReply, configured: false));
    $this->actingAs($staff)->post(route('tools.documents.brief', completeDossier()))->assertRedirect();
    Queue::assertPushed(GenerateDossierBriefJob::class, 1);
});

test('a failed job clears the pending request and tells the followers', function () use ($sectionReply, $coverReply): void {
    $request = completeDossier();
    $request->forceFill(['dossier_brief_requested_at' => now()])->save();
    app()->instance(Assistant::class, briefAssistant($sectionReply, $coverReply, configured: false));

    (new GenerateDossierBriefJob($request))->handle(resolve(GenerateDossierBrief::class));

    expect($request->refresh()->dossier_brief_requested_at)->toBeNull()
        ->and($request->dossier_brief)->toBeNull();
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => str_contains((string) $event->message, 'a échoué'));
});

test('the sheet and the cover print the synthesis, and the page marks it stale once the files change', function () use ($sectionReply, $coverReply): void {
    $request = completeDossier();
    app()->instance(Assistant::class, briefAssistant($sectionReply, $coverReply));
    resolve(GenerateDossierBrief::class)->handle($request);
    $request->refresh()->load('uploads');

    $sheet = resolve(RenderDossierSectionSheet::class)->html($request, '0-income');
    expect($sheet)->toContain('Fiche récapitulative')->toContain('Revenus et salaires')->toContain('Léa Durand')
        ->toContain('Revenus : 4 150 € nets par mois')->toContain('Net mensuel moyen')->toContain('paie-juin.pdf')->toContain('Juin 2026 : 4 100 €')
        // Aucune réserve : la fiche met le dossier en valeur.
        ->not->toContain('Points d’attention')
        ->not->toContain($request->access_code);

    // Partie non lue : la fiche liste les pièces, sans résumé ni mention de l'assistant.
    $plain = resolve(RenderDossierSectionSheet::class)->html($request, '0-savings');
    expect($plain)->toContain('rib.pdf')->not->toContain('Synthèse établie par notre assistant');

    // Déclinée dans la modale : la page de garde simple, même avec une synthèse à jour.
    expect(resolve(RenderDossierCover::class)->html($request, withBrief: false))->not->toContain('Profil des locataires');

    $cover = resolve(RenderDossierCover::class)->html($request);
    expect($cover)->toContain('Nous présentons le dossier')->toContain('Points forts')->toContain('Taux d’effort : 43 %')->toContain('Revenus et salaires')
        // Seules les cartes renseignées : les salaires ; ni imposition ni épargne sans valeur.
        ->toContain('<div class="label">Salaires</div>')->toContain('4 150 € nets / mois')
        ->not->toContain('<div class="label">Imposition</div>')->not->toContain('<div class="label">Épargne</div>')->not->toContain('Non renseigné');

    Http::fake(['docraptor.com/*' => Http::response('%PDF-1.4 fiche', 200, ['Content-Type' => 'application/pdf'])]);
    config()->set('services.docraptor.key', 'doc-key');
    $staff = User::factory()->create();

    $this->get(route('tools.documents.sheet', [$request, '0-income']))->assertRedirect(route('login'));
    $this->actingAs($staff)->get(route('tools.documents.sheet', [$request, '0-income']))
        ->assertOk()
        ->assertHeader('Content-Type', 'application/pdf');
    $this->actingAs($staff)->get(route('tools.documents.sheet', [$request, '0-taxes']))->assertNotFound();
    // `?brief=0` : la page de garde simple, quand l'équipe décline la synthèse dans la modale.
    $this->actingAs($staff)->get(route('tools.documents.cover', [$request, 'brief' => 0]))->assertOk();
    Http::assertSent(fn (Request $sent): bool => str_contains((string) ($sent['document_content'] ?? ''), 'Dossier de location') && ! str_contains((string) ($sent['document_content'] ?? ''), 'Profil des locataires'));

    $this->actingAs($staff)->get(route('tools.documents.show', $request))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('request.brief.fresh', true)
            ->where('request.brief.pending', false)
            ->where('request.brief.cover.highlights.0', 'Revenus : 4 150 € nets par mois')
            ->where('request.brief.sections.1.key', '0-income')
            ->where('request.brief.sections.1.summary', 'Deux bulletins de juin et juillet 2026, salaire stable.'));

    // Une pièce validée de plus : la synthèse ne décrit plus ce dossier.
    $extra = DocumentUpload::factory()->for($request, 'request')->reviewed(DocumentUploadStatus::Accepted)->create(['person_index' => 0, 'document_key' => 'rib', 'original_name' => 'rib-2.pdf']);
    Storage::disk(DocumentUpload::DISK)->put($extra->path, '%PDF-1.4 rib2');

    $this->actingAs($staff)->get(route('tools.documents.show', $request))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page->where('request.brief.fresh', false));

    // Périmée, la page de garde revient à la lettre ou à rien : pas de synthèse d'un autre dossier.
    expect(resolve(RenderDossierCover::class)->html($request->refresh()->load('uploads')))->not->toContain('Nous présentons le dossier');
});

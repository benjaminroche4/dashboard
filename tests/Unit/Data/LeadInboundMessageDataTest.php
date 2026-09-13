<?php

declare(strict_types=1);

use App\Data\LeadInboundMessageData;
use App\Enums\LeadSource;
use App\Models\Lead;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

test('a website lead exposes its form message with the source note', function (): void {
    $lead = Lead::factory()->create([
        'source' => LeadSource::Website,
        'source_note' => 'Formulaire de contact · Recherche de logement · CT-4F2A11',
        'message' => "  Bonjour, j'arrive en octobre.  ",
    ]);

    $inbound = LeadInboundMessageData::fromLead($lead->load('notes'));

    expect($inbound)->not->toBeNull()
        ->and($inbound?->toArray())->toMatchArray([
            'kind' => 'website',
            'body' => "Bonjour, j'arrive en octobre.",
            'meta' => 'Formulaire de contact · Recherche de logement · CT-4F2A11',
        ])
        ->and($inbound?->at?->toIso8601String())->toBe($lead->created_at?->toIso8601String());
});

test('a website lead without message has no inbound message', function (): void {
    $lead = Lead::factory()->create(['source' => LeadSource::Website, 'message' => null]);

    expect(LeadInboundMessageData::fromLead($lead->load('notes')))->toBeNull();
});

test('a phone lead exposes the first call summary or SMS text', function (): void {
    $lead = Lead::factory()->create(['source' => LeadSource::Phone]);
    $lead->notes()->create(['body' => 'Appel entrant (5,5 min, répondu) : Cherche un T2 à Paris 11 : budget 1 800 €.', 'created_at' => now()->subHour()]);
    $lead->notes()->create(['body' => 'Rappeler mardi.']);

    $inbound = LeadInboundMessageData::fromLead($lead->load('notes'));

    expect($inbound?->toArray())->toMatchArray([
        'kind' => 'call',
        'meta' => 'Appel entrant (5,5 min, répondu)',
        'body' => 'Cherche un T2 à Paris 11 : budget 1 800 €.',
    ]);

    $sms = Lead::factory()->create(['source' => LeadSource::Phone]);
    $sms->notes()->create(['body' => 'SMS reçu : Bonjour, êtes-vous disponible demain ?']);

    expect(LeadInboundMessageData::fromLead($sms->load('notes'))?->toArray())->toMatchArray([
        'kind' => 'sms',
        'meta' => 'SMS reçu',
        'body' => 'Bonjour, êtes-vous disponible demain ?',
    ]);
});

test('a lead entered by the team has no inbound message', function (): void {
    $lead = Lead::factory()->create(['source' => LeadSource::Referral, 'message' => 'Note interne.']);

    expect(LeadInboundMessageData::fromLead($lead->load('notes')))->toBeNull();
});

test('the last phone exchange is read whatever the source of the lead', function (): void {
    // Lead venu du site : son message d'arrivée n'est pas un appel, mais
    // l'appel reçu ensuite doit se lire sur la fiche.
    $lead = Lead::factory()->create(['source' => LeadSource::Website, 'message' => 'Je cherche un studio.']);
    $lead->notes()->create(['body' => 'Appel entrant (2 min, répondu) : Veut visiter samedi.']);
    $lead->notes()->create(['body' => 'SMS reçu : Finalement dimanche.']);
    $lead->notes()->create(['body' => 'Note interne.']);

    $last = LeadInboundMessageData::lastPhone($lead->load('notes'));

    // Le dernier échange, pas le premier.
    expect($last?->toArray())->toMatchArray([
        'kind' => 'sms',
        'meta' => 'SMS reçu',
        'body' => 'Finalement dimanche.',
    ]);
    expect($last?->noteId)->not->toBeNull();

    // Lead créé par l'appel : c'est la même note que le message d'arrivée, la
    // fiche ne l'affiche donc qu'une fois.
    $called = Lead::factory()->create(['source' => LeadSource::Phone]);
    $called->notes()->create(['body' => 'Appel entrant (0,6 min, message vocal) : Propose un chalet à louer.']);
    $called->load('notes');

    expect(LeadInboundMessageData::lastPhone($called)?->noteId)
        ->toBe(LeadInboundMessageData::fromLead($called)?->noteId);

    // Aucun appel noté : rien à afficher.
    expect(LeadInboundMessageData::lastPhone(Lead::factory()->create()->load('notes')))->toBeNull();
});

test('the DTO round-trips through from() and toArray()', function (): void {
    $data = ['kind' => 'sms', 'body' => 'Bonjour', 'meta' => 'SMS reçu', 'at' => '2026-09-06T17:03:00+02:00', 'note_id' => 12];

    expect(LeadInboundMessageData::from($data)->toArray())->toBe($data);
});

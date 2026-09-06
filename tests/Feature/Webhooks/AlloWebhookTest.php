<?php

declare(strict_types=1);

use App\Enums\LeadSource;
use App\Enums\LeadStatus;
use App\Enums\StaffRole;
use App\Events\DashboardUpdated;
use App\Http\Middleware\VerifyAlloWebhookSignature;
use App\Models\Lead;
use App\Models\User;
use App\Models\WebhookDelivery;
use Illuminate\Support\Facades\Event;

const ALLO_SECRET = 'whsec_'.'c2VjcmV0LWRlLXRlc3QtYWxsbw=='; // base64("secret-de-test-allo")

/**
 * @param  array<string, mixed>  $payload
 * @return array<string, string>
 */
function alloHeaders(array $payload, string $id = 'msg_1', ?int $timestamp = null, string $secret = ALLO_SECRET): array
{
    $timestamp ??= time();
    $body = json_encode($payload, JSON_THROW_ON_ERROR);

    return [
        'webhook-id' => $id,
        'webhook-timestamp' => (string) $timestamp,
        'webhook-signature' => 'v1,'.VerifyAlloWebhookSignature::sign($id, (string) $timestamp, $body, $secret),
    ];
}

/**
 * @param  array<string, mixed>  $data
 * @return array<string, mixed>
 */
function alloCall(array $data = []): array
{
    return [
        'topic' => 'call.completed',
        'version' => '2.0',
        'timestamp' => '2026-09-06T14:45:00.000Z',
        'data' => [
            'id' => 'cll_2NfDKEm9sF8xK3pQr1Zt',
            'start_date' => '2026-09-06T14:30:00.000Z',
            'recording_url' => null,
            'from_number' => '+33612345678',
            'from_name' => 'Marie Dupont',
            'to' => '+33184804344',
            'to_name' => 'Relocation In Paris',
            'length_in_minutes' => 5.5,
            'length' => '5m 30s',
            'tags' => [],
            'summary' => 'Cherche un T2 dans le 11e pour novembre.',
            'type' => 'INBOUND',
            'result' => 'ANSWERED',
            'user_email' => 'charles@relocation-in-paris.fr',
            ...$data,
        ],
    ];
}

beforeEach(function (): void {
    config()->set('services.allo.webhook_secret', ALLO_SECRET);
    Event::fake([DashboardUpdated::class]);
});

test('an inbound call from a known number is noted on the lead and touches its last contact', function (): void {
    $charles = User::factory()->create(['email' => 'charles@relocation-in-paris.fr', 'role' => StaffRole::Member]);
    $lead = Lead::factory()->create(['phone' => '+33 6 12 34 56 78', 'last_contacted_at' => null]);
    $payload = alloCall();

    $this->postJson(route('webhooks.allo'), $payload, alloHeaders($payload))
        ->assertOk()
        ->assertJsonPath('outcome', 'noted');

    $lead->refresh();
    $note = $lead->notes()->sole();

    expect($note->body)->toBe('Appel entrant (5,5 min, répondu) : Cherche un T2 dans le 11e pour novembre.')
        ->and($note->user_id)->toBe($charles->id)
        ->and($lead->last_contacted_at?->toIso8601String())->toBe('2026-09-06T14:30:00+00:00')
        ->and(Lead::query()->count())->toBe(1);

    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->message === "a reçu un appel de {$lead->fullName()}"
        && $event->actor !== null && $event->actor['id'] === $charles->id);
});

test('an inbound call from an unknown number creates a « Téléphone » lead assigned to the adviser', function (): void {
    $charles = User::factory()->create(['email' => 'charles@relocation-in-paris.fr']);
    $payload = alloCall();

    $this->postJson(route('webhooks.allo'), $payload, alloHeaders($payload))
        ->assertOk()
        ->assertJsonPath('outcome', 'created');

    $lead = Lead::query()->sole();

    expect($lead->first_name)->toBe('Marie')
        ->and($lead->last_name)->toBe('Dupont')
        ->and($lead->phone)->toBe('+33612345678')
        ->and($lead->source)->toBe(LeadSource::Phone)
        ->and($lead->source_note)->toBe('Appel entrant via Allo')
        ->and($lead->status)->toBe(LeadStatus::Todo)
        ->and($lead->assigned_to)->toBe($charles->id)
        ->and($lead->created_by)->toBe($charles->id)
        ->and($lead->notes()->count())->toBe(1);
});

test('a voicemail from an unnamed unknown number creates a lead named after the number', function (): void {
    $payload = alloCall(['from_name' => null, 'result' => 'VOICEMAIL', 'summary' => null, 'length_in_minutes' => 1, 'user_email' => null]);

    $this->postJson(route('webhooks.allo'), $payload, alloHeaders($payload))->assertOk()->assertJsonPath('outcome', 'created');

    $lead = Lead::query()->sole();

    expect($lead->fullName())->toBe('Inconnu +33612345678')
        ->and($lead->assigned_to)->toBeNull()
        ->and($lead->notes()->sole()->body)->toBe('Appel entrant (1 min, message vocal)');

    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->message === 'Appel reçu de Inconnu +33612345678' && $event->actor === null);
});

test('an outbound call is noted on a known lead but never creates one', function (): void {
    $lead = Lead::factory()->create(['phone' => '06 98 76 54 32']);

    $known = alloCall(['type' => 'OUTBOUND', 'from_number' => '+33184804344', 'from_name' => 'Relocation In Paris', 'to' => '+33698765432', 'to_name' => $lead->fullName()]);
    $this->postJson(route('webhooks.allo'), $known, alloHeaders($known, 'msg_out_1'))->assertOk()->assertJsonPath('outcome', 'noted');
    expect($lead->notes()->sole()->body)->toStartWith('Appel sortant (5,5 min, répondu)');

    $unknown = alloCall(['type' => 'OUTBOUND', 'from_number' => '+33184804344', 'to' => '+33600000000', 'to_name' => null]);
    $this->postJson(route('webhooks.allo'), $unknown, alloHeaders($unknown, 'msg_out_2'))->assertOk()->assertJsonPath('outcome', 'ignored');
    expect(Lead::query()->count())->toBe(1);
});

test('a received SMS is noted, and creates a lead when the number is unknown', function (): void {
    $payload = [
        'topic' => 'sms.received',
        'version' => '2.0',
        'timestamp' => '2026-09-06T16:00:00.000Z',
        'data' => [
            'id' => 'msg_3KgELFn0tG9yL4qRs2Au',
            'direction' => 'INBOUND',
            'type' => 'SMS',
            'content' => 'Bonjour, je cherche un appartement pour octobre.',
            'sent_at' => '2026-09-06T16:00:00.000Z',
            'from_number' => '+33612345678',
            'to_number' => '+33184804344',
            'from_name' => 'Marie Dupont',
            'to_name' => 'Relocation In Paris',
            'user_email' => null,
        ],
    ];

    $this->postJson(route('webhooks.allo'), $payload, alloHeaders($payload))->assertOk()->assertJsonPath('outcome', 'created');

    $lead = Lead::query()->sole();

    expect($lead->source_note)->toBe('SMS reçu via Allo')
        ->and($lead->notes()->sole()->body)->toBe('SMS reçu : Bonjour, je cherche un appartement pour octobre.')
        ->and($lead->last_contacted_at?->toIso8601String())->toBe('2026-09-06T16:00:00+00:00');

    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->message === 'SMS reçu de Marie Dupont');
});

test('blocked or failed calls and unsupported topics are acknowledged but ignored', function (): void {
    $blocked = alloCall(['result' => 'BLOCKED']);
    $this->postJson(route('webhooks.allo'), $blocked, alloHeaders($blocked, 'msg_b'))->assertOk()->assertJsonPath('outcome', 'ignored');

    $ringing = ['topic' => 'call.received', 'version' => '2.0', 'timestamp' => '2026-09-06T14:30:00.000Z', 'data' => ['from_number' => '+33612345678', 'to_number' => '+33184804344']];
    $this->postJson(route('webhooks.allo'), $ringing, alloHeaders($ringing, 'msg_r'))->assertOk()->assertJsonPath('outcome', 'ignored');

    expect(Lead::query()->count())->toBe(0);
    Event::assertNotDispatched(DashboardUpdated::class);
});

test('the same delivery id is never processed twice', function (): void {
    $payload = alloCall();

    $this->postJson(route('webhooks.allo'), $payload, alloHeaders($payload, 'msg_same'))->assertOk()->assertJsonPath('outcome', 'created');
    $this->postJson(route('webhooks.allo'), $payload, alloHeaders($payload, 'msg_same'))->assertOk()->assertJsonPath('outcome', 'duplicate');

    expect(Lead::query()->count())->toBe(1)
        ->and(Lead::query()->sole()->notes()->count())->toBe(1)
        ->and(WebhookDelivery::query()->count())->toBe(1);
});

test('a wrong signature, a stale timestamp or a missing secret is rejected', function (): void {
    $payload = alloCall();

    $this->postJson(route('webhooks.allo'), $payload, alloHeaders($payload, secret: 'whsec_'.base64_encode('autre')))->assertUnauthorized();
    $this->postJson(route('webhooks.allo'), $payload, alloHeaders($payload, timestamp: time() - 600))->assertUnauthorized();
    $this->postJson(route('webhooks.allo'), $payload)->assertUnauthorized();

    config()->set('services.allo.webhook_secret');
    $this->postJson(route('webhooks.allo'), $payload, alloHeaders($payload))->assertServiceUnavailable();

    expect(Lead::query()->count())->toBe(0);
});

test('a payload without data is refused with JSON errors', function (): void {
    $payload = ['topic' => 'call.completed'];

    $this->postJson(route('webhooks.allo'), $payload, alloHeaders($payload))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['data']);
});

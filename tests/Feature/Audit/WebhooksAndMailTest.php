<?php

declare(strict_types=1);

use App\Actions\Phone\RecordPhoneEvent;
use App\Data\PhoneEventData;
use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Services\DistrictStaticMap;
use Illuminate\Support\Facades\Event;

beforeEach(fn () => Event::fake([DashboardUpdated::class]));

function phoneEvent(array $overrides = []): PhoneEventData
{
    return PhoneEventData::from('call.completed', [
        'type' => 'INBOUND',
        'from_number' => '+33612345678',
        'from_name' => 'Léa Durand',
        'to' => '+33184804344',
        'result' => 'ANSWERED',
        'length_in_minutes' => 2,
        'summary' => 'Cherche un T2.',
        'user_email' => null,
        'start_date' => '2026-09-08T10:00:00+02:00',
        ...$overrides,
    ]);
}

test('a voicemail is noted on the lead but does not count as a first contact', function (): void {
    $lead = Lead::factory()->create(['phone' => '06 12 34 56 78', 'last_contacted_at' => null]);

    $outcome = resolve(RecordPhoneEvent::class)->handle(phoneEvent(['result' => 'VOICEMAIL']), 'msg_vm');

    expect($outcome)->toBe('noted')
        ->and($lead->fresh()->last_contacted_at)->toBeNull()
        ->and($lead->notes()->count())->toBe(1);
});

test('an answered call dates the contact but a late delivery never rewinds it', function (): void {
    $lead = Lead::factory()->create(['phone' => '06 12 34 56 78', 'last_contacted_at' => '2026-09-08 12:00:00']);

    resolve(RecordPhoneEvent::class)->handle(phoneEvent(['start_date' => '2026-09-08T10:00:00+02:00']), 'msg_late');
    expect($lead->fresh()->last_contacted_at->toDateTimeString())->toBe('2026-09-08 12:00:00');

    resolve(RecordPhoneEvent::class)->handle(phoneEvent(['start_date' => '2026-09-08T15:00:00+02:00']), 'msg_new');
    expect($lead->fresh()->last_contacted_at->gt('2026-09-08 12:00:00'))->toBeTrue();
});

test('the same allo delivery replayed is a duplicate, and a second one with the same id is refused inside the transaction', function (): void {
    Lead::factory()->create(['phone' => '06 12 34 56 78']);

    expect(resolve(RecordPhoneEvent::class)->handle(phoneEvent(), 'msg_1'))->toBe('noted')
        ->and(resolve(RecordPhoneEvent::class)->handle(phoneEvent(), 'msg_1'))->toBe('duplicate')
        ->and(Lead::query()->sole()->notes()->count())->toBe(1);
});

test('a replayed website delivery is ignored even after the lead was deleted', function (): void {
    config()->set('services.rip.webhook_secret', 'secret');
    $body = json_encode(['reference' => 'CT-4F2A11', 'first_name' => 'Léa', 'last_name' => 'Durand', 'email' => 'lea@example.com', 'help_type' => 'housing_search', 'lang' => 'fr']);
    $headers = ['X-Signature' => 'sha256='.hash_hmac('sha256', (string) $body, 'secret'), 'CONTENT_TYPE' => 'application/json', 'Accept' => 'application/json'];

    $this->call('POST', route('webhooks.rip.contact'), [], [], [], $this->transformHeadersToServerVars($headers), (string) $body)->assertCreated();
    Lead::query()->sole()->delete();

    $this->call('POST', route('webhooks.rip.contact'), [], [], [], $this->transformHeadersToServerVars($headers), (string) $body)
        ->assertOk()
        ->assertJsonPath('outcome', 'duplicate');
    expect(Lead::query()->count())->toBe(0);
});

test('the static map of the e-mails uses a dedicated signed key, never the server key', function (): void {
    config()->set('services.google.maps_key', 'server-key');
    config()->set('services.google.static_maps_key');
    expect(DistrictStaticMap::fromConfig()->build([3], 'fr'))->toBeNull();

    config()->set('services.google.static_maps_key', 'static-key');
    // Secret d'exemple de la documentation Google (base64 URL-safe).
    config()->set('services.google.static_maps_secret', 'vNIXE0xscrmjlyV-12Nj_BvUPaw=');
    $url = (string) DistrictStaticMap::fromConfig()->build([3], 'fr');

    expect($url)->toContain('key=static-key')
        ->not->toContain('server-key')
        ->and($url)->toMatch('/&signature=[A-Za-z0-9_-]+=?$/');

    $parts = parse_url($url);
    $unsigned = preg_replace('/&signature=[^&]+$/', '', $parts['path'].'?'.$parts['query']);
    $expected = strtr(base64_encode(hash_hmac('sha1', (string) $unsigned, base64_decode(strtr('vNIXE0xscrmjlyV-12Nj_BvUPaw=', '-_', '+/')), true)), '+/', '-_');
    expect($url)->toEndWith('&signature='.$expected);
});

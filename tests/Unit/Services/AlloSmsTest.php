<?php

declare(strict_types=1);

use App\Services\AlloSms;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

uses(TestCase::class);

test('AlloSms posts the message to /v1/api/sms with the Api-Key header and E.164 numbers', function (): void {
    Http::fake(['api.withallo.com/v1/api/sms' => Http::response(['data' => ['type' => 'OUTBOUND']])]);

    (new AlloSms('ak_live_1', '+33 1 84 80 43 44', null, 'https://api.withallo.com/'))->send('06 12 34 56 78', 'Bonjour');

    Http::assertSentCount(1);
    Http::assertSent(fn (Request $request): bool => $request->url() === 'https://api.withallo.com/v1/api/sms'
        && $request->method() === 'POST'
        && $request->hasHeader('Authorization', 'Api-Key ak_live_1')
        && $request->data() === ['from' => '+33184804344', 'to' => '+33612345678', 'message' => 'Bonjour']);
});

test('AlloSms uses a verified sender id instead of the number when configured', function (): void {
    Http::fake();

    (new AlloSms('ak', null, 'RelocParis', 'https://api.withallo.com'))->send('+33612345678', 'Test');

    Http::assertSent(fn (Request $request): bool => $request->data() === ['sender_id' => 'RelocParis', 'to' => '+33612345678', 'message' => 'Test']);
});

test('AlloSms is silent without a key or a sender, and with an invalid recipient', function (): void {
    Http::fake();

    expect((new AlloSms(null, '+33184804344', null, 'https://api.withallo.com'))->configured())->toBeFalse()
        ->and((new AlloSms('ak', null, null, 'https://api.withallo.com'))->configured())->toBeFalse()
        ->and((new AlloSms('ak', '+33184804344', null, 'https://api.withallo.com'))->configured())->toBeTrue()
        ->and(AlloSms::fromConfig()->configured())->toBeFalse();

    (new AlloSms(null, '+33184804344', null, 'https://api.withallo.com'))->send('+33612345678', 'Test');
    (new AlloSms('ak', '+33184804344', null, 'https://api.withallo.com'))->send('12', 'Test');

    Http::assertNothingSent();
});

test('AlloSms logs a refused request instead of throwing', function (): void {
    Http::fake(['api.withallo.com/*' => Http::response(['message' => 'forbidden'], 403)]);
    Log::spy();

    (new AlloSms('ak', '+33184804344', null, 'https://api.withallo.com'))->send('+33612345678', 'Test');

    Log::shouldHaveReceived('error')->once()->withArgs(fn (string $message): bool => str_contains($message, '403'));
});

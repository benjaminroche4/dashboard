<?php

declare(strict_types=1);

use App\Http\Middleware\VerifyAlloWebhookSignature;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

uses(TestCase::class);

const ALLO_UNIT_SECRET = 'whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw';

/**
 * @param  array<string, string>  $headers
 */
function alloRequest(string $body, array $headers): Request
{
    $request = Request::create('/webhooks/allo', 'POST', server: ['CONTENT_TYPE' => 'application/json'], content: $body);

    foreach ($headers as $name => $value) {
        $request->headers->set($name, $value);
    }

    return $request;
}

function statusOf(callable $callback): int
{
    try {
        $callback();
    } catch (HttpException $e) {
        return $e->getStatusCode();
    }

    return 200;
}

beforeEach(function (): void {
    config()->set('services.allo.webhook_secret', ALLO_UNIT_SECRET);
});

test('the signature follows the Standard Webhooks scheme (id.timestamp.body, base64 HMAC-SHA256 of the decoded whsec key)', function (): void {
    // Vecteur de test de la spécification Standard Webhooks.
    $signature = VerifyAlloWebhookSignature::sign('msg_p5jXN8AQM9LWM0D4loKWxJek', '1614265330', '{"test": 2432232314}', ALLO_UNIT_SECRET);

    expect($signature)->toBe('g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=');
});

test('a correctly signed request passes, even with several signatures in the header', function (): void {
    $body = '{"topic":"call.completed","data":{}}';
    $timestamp = (string) time();
    $good = VerifyAlloWebhookSignature::sign('msg_1', $timestamp, $body, ALLO_UNIT_SECRET);

    $response = (new VerifyAlloWebhookSignature)->handle(
        alloRequest($body, ['webhook-id' => 'msg_1', 'webhook-timestamp' => $timestamp, 'webhook-signature' => "v1,ancienne v1,{$good}"]),
        fn (): Response => new Response('ok'),
    );

    expect($response->getContent())->toBe('ok');
});

test('tampering, a stale timestamp, a missing header or a missing secret is rejected', function (): void {
    $body = '{"topic":"call.completed","data":{}}';
    $timestamp = (string) time();
    $good = VerifyAlloWebhookSignature::sign('msg_1', $timestamp, $body, ALLO_UNIT_SECRET);
    $middleware = new VerifyAlloWebhookSignature;
    $next = fn (): Response => new Response('ok');

    expect(statusOf(fn (): Symfony\Component\HttpFoundation\Response => $middleware->handle(alloRequest('{"topic":"sms.received","data":{}}', ['webhook-id' => 'msg_1', 'webhook-timestamp' => $timestamp, 'webhook-signature' => "v1,{$good}"]), $next)))->toBe(401)
        ->and(statusOf(fn (): Symfony\Component\HttpFoundation\Response => $middleware->handle(alloRequest($body, ['webhook-id' => 'msg_2', 'webhook-timestamp' => $timestamp, 'webhook-signature' => "v1,{$good}"]), $next)))->toBe(401)
        ->and(statusOf(fn (): Symfony\Component\HttpFoundation\Response => $middleware->handle(alloRequest($body, ['webhook-id' => 'msg_1', 'webhook-timestamp' => (string) (time() - 400), 'webhook-signature' => 'v1,'.VerifyAlloWebhookSignature::sign('msg_1', (string) (time() - 400), $body, ALLO_UNIT_SECRET)]), $next)))->toBe(401)
        ->and(statusOf(fn (): Symfony\Component\HttpFoundation\Response => $middleware->handle(alloRequest($body, ['webhook-id' => 'msg_1', 'webhook-timestamp' => $timestamp]), $next)))->toBe(401);

    config()->set('services.allo.webhook_secret', '');
    expect(statusOf(fn (): Symfony\Component\HttpFoundation\Response => $middleware->handle(alloRequest($body, ['webhook-id' => 'msg_1', 'webhook-timestamp' => $timestamp, 'webhook-signature' => "v1,{$good}"]), $next)))->toBe(503);
});

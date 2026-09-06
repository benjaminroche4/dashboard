<?php

declare(strict_types=1);

use App\Http\Middleware\VerifyRipWebhookSignature;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

uses(TestCase::class);

function signedRequest(string $body, ?string $signature): Request
{
    $request = Request::create('/webhooks/rip/contact', 'POST', server: ['CONTENT_TYPE' => 'application/json'], content: $body);

    if ($signature !== null) {
        $request->headers->set('X-Signature', $signature);
    }

    return $request;
}

beforeEach(function (): void {
    config()->set('services.rip.webhook_secret', 'abc');
});

test('a body signed with the shared secret passes', function (): void {
    $body = '{"reference":"CT-1"}';
    $signature = 'sha256='.hash_hmac('sha256', $body, 'abc');

    $response = (new VerifyRipWebhookSignature)->handle(signedRequest($body, $signature), fn (): Response => new Response('ok'));

    expect($response->getContent())->toBe('ok');
});

test('a tampered body, a wrong secret or a missing header is rejected with 401', function (string $body, ?string $signature): void {
    expect(fn (): Symfony\Component\HttpFoundation\Response => (new VerifyRipWebhookSignature)->handle(signedRequest($body, $signature), fn (): Response => new Response('ok')))
        ->toThrow(function (HttpException $e): void {
            expect($e->getStatusCode())->toBe(401);
        });
})->with([
    'tampered body' => ['{"reference":"CT-2"}', 'sha256='.hash_hmac('sha256', '{"reference":"CT-1"}', 'abc')],
    'wrong secret' => ['{"reference":"CT-1"}', 'sha256='.hash_hmac('sha256', '{"reference":"CT-1"}', 'xyz')],
    'missing header' => ['{"reference":"CT-1"}', null],
]);

test('without a configured secret the route answers 503', function (): void {
    config()->set('services.rip.webhook_secret', '');

    expect(fn (): Symfony\Component\HttpFoundation\Response => (new VerifyRipWebhookSignature)->handle(signedRequest('{}', 'sha256=x'), fn (): Response => new Response('ok')))
        ->toThrow(function (HttpException $e): void {
            expect($e->getStatusCode())->toBe(503);
        });
});

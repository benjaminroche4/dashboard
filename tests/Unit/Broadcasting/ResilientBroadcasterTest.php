<?php

declare(strict_types=1);

use App\Broadcasting\ResilientBroadcaster;
use Illuminate\Contracts\Broadcasting\Broadcaster;
use Illuminate\Support\Facades\Exceptions;
use Tests\TestCase;

uses(TestCase::class);

test('a failing inner broadcaster is reported instead of thrown', function (): void {
    Exceptions::fake();
    $inner = new class implements Broadcaster
    {
        public function auth($request): mixed
        {
            return 'auth';
        }

        public function validAuthenticationResponse($request, $result): mixed
        {
            return 'valid';
        }

        public function broadcast(array $channels, $event, array $payload = []): void
        {
            throw new RuntimeException('Reverb injoignable');
        }
    };

    $broadcaster = new ResilientBroadcaster($inner);
    $broadcaster->broadcast(['staff'], 'dashboard.updated', ['id' => 1]);

    Exceptions::assertReported(fn (RuntimeException $e): bool => $e->getMessage() === 'Reverb injoignable');
    expect($broadcaster->auth(request()))->toBe('auth')
        ->and($broadcaster->validAuthenticationResponse(request(), []))->toBe('valid');
});

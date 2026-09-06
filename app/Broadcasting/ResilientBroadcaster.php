<?php

declare(strict_types=1);

namespace App\Broadcasting;

use Illuminate\Contracts\Broadcasting\Broadcaster;
use Throwable;

/**
 * Enveloppe un broadcaster (Reverb) pour qu'une panne du serveur de websockets
 * ne fasse jamais échouer la requête qui a déclenché l'événement : l'erreur
 * est signalée (logs, Pulse) et la mutation aboutit normalement.
 */
final readonly class ResilientBroadcaster implements Broadcaster
{
    public function __construct(private Broadcaster $inner) {}

    public function auth($request): mixed
    {
        return $this->inner->auth($request);
    }

    public function validAuthenticationResponse($request, $result): mixed
    {
        return $this->inner->validAuthenticationResponse($request, $result);
    }

    /**
     * @param  array<int, string>  $channels
     * @param  array<string, mixed>  $payload
     */
    public function broadcast(array $channels, $event, array $payload = []): void
    {
        try {
            $this->inner->broadcast($channels, $event, $payload);
        } catch (Throwable $exception) {
            report($exception);
        }
    }

    /**
     * Les méthodes hors contrat (ex. resolveAuthenticatedUser) sont déléguées telles quelles.
     *
     * @param  array<int, mixed>  $arguments
     */
    public function __call(string $method, array $arguments): mixed
    {
        return $this->inner->{$method}(...$arguments);
    }
}

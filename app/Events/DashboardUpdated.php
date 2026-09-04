<?php

declare(strict_types=1);

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Événement générique diffusé à tout le staff après une action du backoffice.
 *
 * Usage : DashboardUpdated::dispatch('orders', ['id' => 42]);
 * Côté front, useStaffChannel() recharge les props Inertia concernées.
 */
class DashboardUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * @param  string  $resource  Nom de la ressource touchée (ex. "orders", "users")
     * @param  array<string, mixed>  $payload  Données optionnelles
     */
    public function __construct(
        public string $resource,
        public array $payload = [],
    ) {}

    /**
     * @return array<int, PresenceChannel>
     */
    public function broadcastOn(): array
    {
        return [new PresenceChannel('staff')];
    }

    public function broadcastAs(): string
    {
        return 'dashboard.updated';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'resource' => $this->resource,
            'payload' => $this->payload,
            'at' => now()->toIso8601String(),
        ];
    }
}

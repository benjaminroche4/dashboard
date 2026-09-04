<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\User;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Auth;

/**
 * Événement générique diffusé à tout le staff après une action du backoffice.
 *
 * Usage : DashboardUpdated::dispatch('orders', ['id' => 42], 'a expédié la commande #42');
 * Côté front, le hook useStaffChannel() affiche un toast "<acteur> <message>"
 * aux autres membres connectés et recharge les props Inertia.
 */
final class DashboardUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /** @var array{id: int, name: string}|null */
    public readonly ?array $actor;

    /**
     * @param  string  $resource  Nom de la ressource touchée (ex. "orders", "users")
     * @param  array<string, mixed>  $payload  Données optionnelles
     * @param  string|null  $message  Phrase affichée dans le toast, après le nom de l'acteur
     * @param  User|null  $actor  Auteur de l'action, utilisateur connecté par défaut
     */
    public function __construct(
        public readonly string $resource,
        public readonly array $payload = [],
        public readonly ?string $message = null,
        ?User $actor = null,
    ) {
        $actor ??= Auth::user();

        $this->actor = $actor instanceof User ? ['id' => $actor->id, 'name' => $actor->name] : null;
    }

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
            'message' => $this->message ?? "a modifié {$this->resource}",
            'actor' => $this->actor,
            'at' => now()->toIso8601String(),
        ];
    }
}

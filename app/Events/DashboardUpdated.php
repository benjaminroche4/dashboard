<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\Lead;
use App\Models\User;
use App\Support\ActivityResource;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Auth;

/**
 * Événement générique diffusé à tout le staff après une action du backoffice.
 *
 * Diffusé immédiatement (pas de queue) : la latence perçue par les autres
 * membres est celle d'un appel HTTP à Reverb, quelques millisecondes.
 * Dispatché après le commit quand il est levé dans une transaction : les
 * autres onglets rechargent un état réellement écrit, jamais un rollback.
 *
 * Usage : DashboardUpdated::dispatch('orders', ['id' => 42], 'a expédié la commande #42');
 * Côté front, le hook useStaffChannel() affiche un toast "<acteur> <message>"
 * aux autres membres connectés et recharge les props Inertia.
 */
final class DashboardUpdated implements ShouldBroadcastNow, ShouldDispatchAfterCommit
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

        // L'onglet à l'origine de l'action (en-tête X-Socket-ID) est exclu : il a
        // déjà la réponse Inertia. Les autres onglets du même utilisateur reçoivent.
        $this->dontBroadcastToCurrentUser();
    }

    /**
     * Identifiants des membres qui suivent le lead visé par le payload
     * (`lead_id`, ou `id` d'une ressource lead). Vide quand l'événement ne
     * touche aucun lead : il ne concerne personne en particulier.
     *
     * @return list<int>
     */
    public function concerns(): array
    {
        $id = $this->payload['lead_id'] ?? null;

        if ($id === null && ActivityResource::concernsLead($this->resource)) {
            $id = $this->payload['id'] ?? null;
        }

        if (! is_int($id) && (! is_string($id) || ! ctype_digit($id))) {
            return [];
        }

        $lead = Lead::query()->with(['assignee', 'coAssignee'])->find((int) $id);

        return $lead instanceof Lead ? array_map(fn (User $member): int => $member->id, $lead->followers()) : [];
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
            // Membres que l'événement concerne (suivi du lead touché) : le
            // front ne fait de bruit que chez eux, les autres rechargent en silence.
            'concerns' => $this->concerns(),
            'at' => now()->toIso8601String(),
        ];
    }
}

<?php

declare(strict_types=1);

namespace App\Actions\Webhooks;

use App\Models\WebhookDelivery;
use Illuminate\Database\UniqueConstraintViolationException;

/**
 * Réserve une livraison de webhook (fournisseur + identifiant) : `false` si
 * elle a déjà été traitée. Sert d'anti-rejeu quand le fournisseur ne signe
 * pas d'horodatage (site RIP : identifiant = empreinte du corps signé).
 */
final class ClaimWebhookDelivery
{
    public function handle(string $provider, string $deliveryId): bool
    {
        try {
            WebhookDelivery::query()->create(['provider' => $provider, 'delivery_id' => $deliveryId, 'created_at' => now()]);
        } catch (UniqueConstraintViolationException) {
            return false;
        }

        return true;
    }
}

<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/**
 * Livraison de webhook déjà traitée (idempotence).
 *
 * @property int $id
 * @property string $provider
 * @property string $delivery_id
 * @property CarbonInterface|null $created_at
 */
#[Fillable(['provider', 'delivery_id', 'created_at'])]
class WebhookDelivery extends Model
{
    public $timestamps = false;
}

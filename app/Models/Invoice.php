<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\Currency;
use App\Enums\InvoiceStatus;
use Database\Factories\InvoiceFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $number
 * @property string $client_name
 * @property string|null $client_email
 * @property string|null $client_street
 * @property string|null $client_postal_code
 * @property string|null $client_city
 * @property string|null $client_country
 * @property string|null $client_address
 * @property list<array{offer: string, description: string, quantity: float, unit_price_cents: int}>|null $items
 * @property float $vat_rate
 * @property int $subtotal_cents
 * @property int $vat_cents
 * @property int $amount_cents
 * @property Currency $currency
 * @property InvoiceStatus $status
 * @property Carbon $issued_at
 * @property Carbon $due_at
 * @property Carbon|null $paid_at
 * @property string|null $notes
 * @property int|null $created_by
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'number', 'client_name', 'client_email', 'client_street', 'client_postal_code', 'client_city', 'client_country',
    'client_address', 'items', 'vat_rate',
    'subtotal_cents', 'vat_cents', 'amount_cents', 'currency', 'status',
    'issued_at', 'due_at', 'paid_at', 'notes', 'created_by',
])]
class Invoice extends Model
{
    /** @use HasFactory<InvoiceFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'items' => 'array',
            'vat_rate' => 'float',
            'currency' => Currency::class,
            'status' => InvoiceStatus::class,
            'issued_at' => 'date',
            'due_at' => 'date',
            'paid_at' => 'date',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

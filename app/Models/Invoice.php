<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\Currency;
use App\Enums\InvoiceStatus;
use App\Support\BankAccounts;
use Carbon\CarbonInterface;
use Database\Factories\InvoiceFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property string $uuid
 * @property string $number
 * @property string $client_name
 * @property string|null $client_email
 * @property string|null $client_street
 * @property string|null $client_postal_code
 * @property string|null $client_city
 * @property string|null $client_country
 * @property string|null $client_address
 * @property list<array{offer: string|null, description: string, quantity: float, unit_price_cents: int}>|null $items
 * @property float $vat_rate
 * @property float $discount_percent
 * @property int $discount_cents
 * @property int $subtotal_cents
 * @property int $vat_cents
 * @property int $amount_cents
 * @property int $deposit_cents
 * @property Currency $currency
 * @property InvoiceStatus $status
 * @property CarbonInterface $issued_at
 * @property CarbonInterface $due_at
 * @property CarbonInterface|null $sent_at
 * @property CarbonInterface|null $paid_at
 * @property string|null $notes
 * @property string|null $bank_name
 * @property string|null $bank_iban
 * @property int|null $created_by
 * @property int|null $lead_id
 * @property CarbonInterface|null $created_at
 * @property CarbonInterface|null $updated_at
 */
#[Fillable([
    'number', 'client_name', 'client_email', 'client_street', 'client_postal_code', 'client_city', 'client_country',
    'client_address', 'items', 'vat_rate', 'discount_percent', 'discount_cents',
    'subtotal_cents', 'vat_cents', 'amount_cents', 'deposit_cents', 'currency', 'status',
    'issued_at', 'due_at', 'sent_at', 'paid_at', 'notes', 'created_by', 'lead_id', 'bank_name', 'bank_iban',
])]
class Invoice extends Model
{
    /** @use HasFactory<InvoiceFactory> */
    use HasFactory;

    use HasUuids;

    /**
     * L'UUID est l'identifiant public (URL) ; l'identifiant numérique reste la clé primaire.
     *
     * @return list<string>
     */
    public function uniqueIds(): array
    {
        return ['uuid'];
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'items' => 'array',
            'vat_rate' => 'float',
            'discount_percent' => 'float',
            'sent_at' => 'datetime',
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

    /**
     * Lead à l'origine de la facture, s'il est rattaché.
     *
     * @return BelongsTo<Lead, $this>
     */
    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    /**
     * @return HasMany<InvoiceStatusChange, $this>
     */
    public function statusChanges(): HasMany
    {
        return $this->hasMany(InvoiceStatusChange::class)->oldest()->orderBy('id');
    }

    /**
     * Coordonnées bancaires à imprimer : celles figées sur le document, sinon
     * le compte par défaut de sa devise.
     *
     * @return array{bank: string, iban: string}
     */
    public function bankAccount(): array
    {
        return BankAccounts::resolve($this->bank_name, $this->bank_iban, $this->currency);
    }

    /** Reste à payer : total TTC moins l'acompte déjà versé. */
    public function dueCents(): int
    {
        return max(0, $this->amount_cents - $this->deposit_cents);
    }

    /**
     * Change le statut en journalisant la transition. Lève si elle est interdite.
     */
    public function transitionTo(InvoiceStatus $status, ?User $by = null, ?string $note = null): void
    {
        if (! $this->status->canTransitionTo($status)) {
            throw new \DomainException("Passage de {$this->status->label()} à {$status->label()} impossible.");
        }

        $from = $this->status;
        $this->status = $status;
        $this->save();

        $this->statusChanges()->create([
            'from_status' => $from,
            'to_status' => $status,
            'changed_by' => $by?->id,
            'note' => $note,
            'created_at' => now(),
        ]);
    }
}

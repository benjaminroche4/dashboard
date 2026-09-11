<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ContactFunction;
use Carbon\CarbonInterface;
use Database\Factories\PartnerContactFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Interlocuteur chez un partenaire.
 *
 * @property int $id
 * @property int $partner_id
 * @property string $first_name
 * @property string $last_name
 * @property ContactFunction|null $position
 * @property bool $is_primary
 * @property string|null $email
 * @property string|null $phone
 * @property CarbonInterface|null $created_at
 * @property CarbonInterface|null $updated_at
 * @property-read Partner $partner
 */
#[Fillable(['partner_id', 'first_name', 'last_name', 'position', 'is_primary', 'email', 'phone'])]
class PartnerContact extends Model
{
    /** @use HasFactory<PartnerContactFactory> */
    use HasFactory;

    public function fullName(): string
    {
        return trim("{$this->first_name} {$this->last_name}");
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['position' => ContactFunction::class, 'is_primary' => 'boolean'];
    }

    /**
     * @return BelongsTo<Partner, $this>
     */
    public function partner(): BelongsTo
    {
        return $this->belongsTo(Partner::class);
    }
}

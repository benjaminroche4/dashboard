<?php

declare(strict_types=1);

namespace App\Models;

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
 * @property string|null $position
 * @property string|null $email
 * @property string|null $phone
 * @property CarbonInterface|null $created_at
 * @property CarbonInterface|null $updated_at
 * @property-read Partner $partner
 */
#[Fillable(['partner_id', 'first_name', 'last_name', 'position', 'email', 'phone'])]
class PartnerContact extends Model
{
    /** @use HasFactory<PartnerContactFactory> */
    use HasFactory;

    public function fullName(): string
    {
        return trim("{$this->first_name} {$this->last_name}");
    }

    /**
     * @return BelongsTo<Partner, $this>
     */
    public function partner(): BelongsTo
    {
        return $this->belongsTo(Partner::class);
    }
}

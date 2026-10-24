<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ContactFunction;
use Carbon\CarbonInterface;
use Database\Factories\CompanyContactFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Contact dans une entreprise. Plusieurs contacts peuvent être principaux :
 * une direction des ressources humaines a souvent deux ou trois référents.
 *
 * @property int $id
 * @property int $company_id
 * @property string $first_name
 * @property string $last_name
 * @property ContactFunction|null $position
 * @property bool $is_primary
 * @property string|null $email
 * @property string|null $phone
 * @property CarbonInterface|null $created_at
 * @property CarbonInterface|null $updated_at
 * @property-read Company $company
 */
#[Fillable(['company_id', 'first_name', 'last_name', 'position', 'is_primary', 'email', 'phone'])]
class CompanyContact extends Model
{
    /** @use HasFactory<CompanyContactFactory> */
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
     * @return BelongsTo<Company, $this>
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }
}

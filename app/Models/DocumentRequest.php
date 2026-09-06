<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\LeadLanguage;
use Carbon\CarbonInterface;
use Database\Factories\DocumentRequestFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Demande de pièces justificatives adressée à un client : personnes du
 * foyer, pièces cochées par personne, message et lien de dépôt sécurisé.
 *
 * @property int $id
 * @property string $first_name
 * @property string $last_name
 * @property LeadLanguage $language
 * @property string|null $message
 * @property string $upload_url
 * @property list<array{first_name?: string, last_name?: string, role: string, documents: list<string>}> $persons
 * @property int|null $created_by
 * @property int|null $lead_id
 * @property CarbonInterface|null $created_at
 * @property CarbonInterface|null $updated_at
 */
#[Fillable(['first_name', 'last_name', 'language', 'message', 'upload_url', 'persons', 'created_by', 'lead_id'])]
class DocumentRequest extends Model
{
    /** @use HasFactory<DocumentRequestFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'language' => LeadLanguage::class,
            'persons' => 'array',
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
     * Lead à l'origine de la liste, s'il y en a un.
     *
     * @return BelongsTo<Lead, $this>
     */
    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function fullName(): string
    {
        return trim("{$this->first_name} {$this->last_name}");
    }

    /** Nombre total de pièces demandées, toutes personnes confondues. */
    public function documentCount(): int
    {
        return array_sum(array_map(fn (array $person): int => count($person['documents']), $this->persons));
    }
}

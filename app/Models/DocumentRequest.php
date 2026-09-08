<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\LeadLanguage;
use Carbon\CarbonInterface;
use Database\Factories\DocumentRequestFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Demande de pièces justificatives adressée à un client : personnes du
 * foyer, pièces cochées par personne, message et lien de dépôt sécurisé.
 *
 * @property int $id
 * @property string $uuid
 * @property string $first_name
 * @property string $last_name
 * @property LeadLanguage $language
 * @property string|null $message
 * @property string|null $upload_url
 * @property string $public_token
 * @property string $access_code
 * @property string|null $link_sent_to
 * @property CarbonInterface|null $link_sent_at
 * @property list<array{first_name?: string, last_name?: string, role: string, documents: list<string>}> $persons
 * @property int|null $created_by
 * @property int|null $lead_id
 * @property CarbonInterface|null $created_at
 * @property CarbonInterface|null $updated_at
 */
#[Fillable(['first_name', 'last_name', 'language', 'message', 'upload_url', 'public_token', 'access_code', 'link_sent_to', 'link_sent_at', 'persons', 'created_by', 'lead_id'])]
class DocumentRequest extends Model
{
    /** @use HasFactory<DocumentRequestFactory> */
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
            'language' => LeadLanguage::class,
            'persons' => 'array',
            'link_sent_at' => 'datetime',
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

    /**
     * Pièces déposées par le client sur la page publique.
     *
     * @return HasMany<DocumentUpload, $this>
     */
    public function uploads(): HasMany
    {
        return $this->hasMany(DocumentUpload::class);
    }

    /** Adresse publique de dépôt des pièces, à transmettre au client. */
    public function publicUrl(): string
    {
        return route('documents.public.show', ['documentRequest' => $this->public_token]);
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

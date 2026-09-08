<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\CarbonInterface;
use Database\Factories\DocumentUploadFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Pièce déposée par le client sur la page publique d'une demande de pièces,
 * stockée sur le disque privé.
 *
 * @property int $id
 * @property string $uuid
 * @property int $document_request_id
 * @property int $person_index
 * @property string $document_key
 * @property string $original_name
 * @property string $path
 * @property string $mime_type
 * @property int $size
 * @property CarbonInterface|null $created_at
 * @property CarbonInterface|null $updated_at
 */
#[Fillable(['document_request_id', 'person_index', 'document_key', 'original_name', 'path', 'mime_type', 'size'])]
class DocumentUpload extends Model
{
    /** @use HasFactory<DocumentUploadFactory> */
    use HasFactory;

    use HasUuids;

    /** Disque privé où les pièces sont conservées. */
    public const string DISK = 'local';

    /**
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
     * @return BelongsTo<DocumentRequest, $this>
     */
    public function request(): BelongsTo
    {
        return $this->belongsTo(DocumentRequest::class, 'document_request_id');
    }
}

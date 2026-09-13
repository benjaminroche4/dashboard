<?php

declare(strict_types=1);

namespace App\Http\Requests\Documents;

use App\Enums\DocumentUploadStatus;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReviewDocumentUploadRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            // « À vérifier » remet la pièce en attente : l'équipe peut revenir sur sa décision.
            'status' => ['required', Rule::enum(DocumentUploadStatus::class)],
            // Motif facultatif, lu par le client : on le garde court.
            'note' => ['nullable', 'string', 'max:500'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return ['status' => 'décision', 'note' => 'motif'];
    }
}

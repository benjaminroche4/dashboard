<?php

declare(strict_types=1);

namespace App\Http\Requests\Partners;

use App\Enums\RelationshipQuality;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Suivi d'un partenaire : dernier échange et qualité de la relation. */
class TouchPartnerRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'at' => ['nullable', 'date'],
            'relationship_quality' => ['nullable', Rule::enum(RelationshipQuality::class)],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return ['at' => 'date de l’échange', 'relationship_quality' => 'qualité de la relation'];
    }
}

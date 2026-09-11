<?php

declare(strict_types=1);

namespace App\Http\Requests\RealEstate;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Échange noté avec une agence ou un agent : la date est facultative, faute
 * de quoi c'est maintenant.
 */
class TouchDirectoryRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return ['at' => ['nullable', 'date']];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return ['at' => 'date de l’échange'];
    }
}

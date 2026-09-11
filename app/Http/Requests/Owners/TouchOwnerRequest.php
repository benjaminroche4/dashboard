<?php

declare(strict_types=1);

namespace App\Http\Requests\Owners;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/** Échange noté avec un propriétaire : la date est facultative, sinon maintenant. */
class TouchOwnerRequest extends FormRequest
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

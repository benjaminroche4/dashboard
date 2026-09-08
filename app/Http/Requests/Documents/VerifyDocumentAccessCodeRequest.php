<?php

declare(strict_types=1);

namespace App\Http\Requests\Documents;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/** Code d'appairage saisi par le client sur la page publique de dépôt. */
class VerifyDocumentAccessCodeRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'code' => ['required', 'digits:6'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'code.required' => __('Saisissez le code à 6 chiffres.'),
            'code.digits' => __('Saisissez le code à 6 chiffres.'),
        ];
    }
}

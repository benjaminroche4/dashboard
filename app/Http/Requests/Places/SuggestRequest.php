<?php

declare(strict_types=1);

namespace App\Http\Requests\Places;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class SuggestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'input' => ['required', 'string', 'min:3', 'max:200'],
            'regions' => ['nullable', 'array', 'max:5'],
            'regions.*' => ['string', 'size:2', 'alpha'],
            'session' => ['nullable', 'string', 'max:64'],
        ];
    }
}

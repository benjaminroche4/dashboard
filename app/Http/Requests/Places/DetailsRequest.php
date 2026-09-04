<?php

declare(strict_types=1);

namespace App\Http\Requests\Places;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class DetailsRequest extends FormRequest
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
            'place_id' => ['required', 'string', 'max:255'],
            'session' => ['nullable', 'string', 'max:64'],
        ];
    }
}

<?php

declare(strict_types=1);

namespace App\Http\Requests\Properties;

use App\Models\Property;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class FindPropertyTransitRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', Property::class) ?? false;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'street' => ['required', 'string', 'max:255'],
            'postal_code' => ['nullable', 'string', 'max:20'],
            'city' => ['nullable', 'string', 'max:255'],
        ];
    }

    /** Adresse sur une ligne, telle qu'on l'enverrait à un plan. */
    public function address(): string
    {
        return trim(implode(', ', array_filter([
            trim((string) $this->validated('street')),
            trim(implode(' ', array_filter([
                (string) ($this->validated('postal_code') ?? ''),
                (string) ($this->validated('city') ?? ''),
            ]))),
        ])));
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return ['street' => 'rue', 'postal_code' => 'code postal', 'city' => 'ville'];
    }
}

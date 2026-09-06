<?php

declare(strict_types=1);

namespace App\Http\Requests\Webhooks;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Enveloppe d'un webhook Allo : `topic`, `version`, `timestamp`, `data`.
 * Les sujets non pris en charge sont acceptés puis ignorés (Allo attend un 2xx).
 */
class StoreAlloEventRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'topic' => ['required', 'string', 'max:60'],
            'data' => ['required', 'array'],
            'data.id' => ['nullable', 'string', 'max:120'],
            'data.from_number' => ['nullable', 'string', 'max:40'],
            'data.to_number' => ['nullable', 'string', 'max:40'],
            'data.to' => ['nullable', 'string', 'max:40'],
            'data.from_name' => ['nullable', 'string', 'max:150'],
            'data.to_name' => ['nullable', 'string', 'max:150'],
            'data.type' => ['nullable', 'string', 'max:20'],
            'data.direction' => ['nullable', 'string', 'max:20'],
            'data.result' => ['nullable', 'string', 'max:40'],
            'data.length_in_minutes' => ['nullable', 'numeric', 'min:0'],
            'data.summary' => ['nullable', 'string', 'max:5000'],
            'data.content' => ['nullable', 'string', 'max:5000'],
            'data.user_email' => ['nullable', 'string', 'max:255'],
            'data.start_date' => ['nullable', 'date'],
            'data.sent_at' => ['nullable', 'date'],
        ];
    }
}

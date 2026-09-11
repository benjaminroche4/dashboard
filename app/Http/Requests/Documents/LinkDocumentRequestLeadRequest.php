<?php

declare(strict_types=1);

namespace App\Http\Requests\Documents;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class LinkDocumentRequestLeadRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            // null détache la liste du lead.
            'lead_id' => ['nullable', 'integer', 'exists:leads,id'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return ['lead_id' => 'lead'];
    }
}

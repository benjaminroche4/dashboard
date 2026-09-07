<?php

declare(strict_types=1);

namespace App\Http\Requests\Partners;

use App\Models\Lead;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ForwardLeadDossierRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var Lead|null $lead */
        $lead = $this->route('lead');

        return $lead !== null && ($this->user()?->can('update', $lead) ?? false);
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'email' => ['required', 'email', 'max:255'],
            'message' => ['nullable', 'string', 'max:2000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return ['email' => 'destinataire', 'message' => 'message'];
    }
}

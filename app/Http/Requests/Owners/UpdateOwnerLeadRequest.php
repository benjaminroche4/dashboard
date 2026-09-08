<?php

declare(strict_types=1);

namespace App\Http\Requests\Owners;

use App\Models\Lead;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateOwnerLeadRequest extends FormRequest
{
    public function authorize(): bool
    {
        $lead = $this->route('lead');

        return $lead instanceof Lead && ($this->user()?->can('update', $lead) ?? false);
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return StoreOwnerLeadRequest::ownerLeadRules();
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return StoreOwnerLeadRequest::ownerLeadAttributes();
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return StoreOwnerLeadRequest::ownerLeadMessages();
    }
}

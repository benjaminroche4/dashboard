<?php

declare(strict_types=1);

namespace App\Http\Requests\Quotes;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class LinkQuoteLeadRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            // null détache le devis. Un seul des deux est envoyé : le
            // document est adressé à un lead ou à un partenaire.
            'lead_id' => ['nullable', 'integer', 'exists:leads,id'],
            'partner_id' => ['nullable', 'integer', 'exists:partners,id'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return ['lead_id' => 'lead', 'partner_id' => 'partenaire'];
    }
}

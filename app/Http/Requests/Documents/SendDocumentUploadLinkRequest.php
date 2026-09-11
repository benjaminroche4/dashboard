<?php

declare(strict_types=1);

namespace App\Http\Requests\Documents;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class SendDocumentUploadLinkRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            // Le client et, s'il y en a, le second locataire ou un tiers.
            'emails' => ['required', 'array', 'min:1', 'max:5'],
            'emails.*' => ['required', 'email:rfc', 'max:255', 'distinct'],
        ];
    }

    /**
     * Destinataires validés, sans doublon ni espace superflu.
     *
     * @return list<string>
     */
    public function emails(): array
    {
        /** @var list<string> $emails */
        $emails = $this->validated('emails');

        return array_values(array_unique(array_map(trim(...), $emails)));
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return ['emails' => 'destinataires', 'emails.*' => 'e-mail'];
    }
}

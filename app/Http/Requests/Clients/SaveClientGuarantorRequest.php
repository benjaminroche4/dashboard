<?php

declare(strict_types=1);

namespace App\Http\Requests\Clients;

use App\Support\PhoneNumber;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

/** Garant d'un dossier : nom obligatoire, le reste facultatif. */
class SaveClientGuarantorRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:40'],
            'income_cents' => ['nullable', 'integer', 'min:0', 'max:100000000'],
            'note' => ['nullable', 'string', 'max:2000'],
        ];
    }

    /**
     * @return list<callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $phone = $this->string('phone')->trim()->value();

                if ($phone !== '' && PhoneNumber::e164($phone) === null) {
                    $validator->errors()->add('phone', __('Ce numéro de téléphone n’est pas valide.'));
                }
            },
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'first_name' => 'prénom du garant',
            'last_name' => 'nom du garant',
            'email' => 'e-mail du garant',
            'phone' => 'téléphone du garant',
            'income_cents' => 'revenu du garant',
            'note' => 'note',
        ];
    }
}

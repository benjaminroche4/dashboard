<?php

declare(strict_types=1);

namespace App\Http\Requests\Clients;

use App\Support\PhoneNumber;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

/**
 * Second locataire et second membre qui suit le dossier : tout est facultatif,
 * mais un second locataire nommé garde des coordonnées valides.
 */
class UpdateClientPeopleRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'co_first_name' => ['nullable', 'string', 'max:255'],
            'co_last_name' => ['nullable', 'string', 'max:255'],
            'co_email' => ['nullable', 'email', 'max:255'],
            'co_phone' => ['nullable', 'string', 'max:40'],
            // Revenus mensuels nets, en centimes.
            'income_cents' => ['nullable', 'integer', 'min:0', 'max:100000000'],
            'co_income_cents' => ['nullable', 'integer', 'min:0', 'max:100000000'],
            'assigned_to' => ['nullable', 'integer', 'exists:users,id'],
            'co_assigned_to' => ['nullable', 'integer', 'exists:users,id'],
        ];
    }

    /**
     * @return list<callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $phone = $this->string('co_phone')->trim()->value();

                if ($phone !== '' && PhoneNumber::e164($phone) === null) {
                    $validator->errors()->add('co_phone', __('Ce numéro de téléphone n’est pas valide.'));
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
            'co_first_name' => 'prénom du second locataire',
            'co_last_name' => 'nom du second locataire',
            'co_email' => 'e-mail du second locataire',
            'co_phone' => 'téléphone du second locataire',
            'income_cents' => 'revenu du locataire',
            'co_income_cents' => 'revenu du second locataire',
            'assigned_to' => 'membre qui suit le dossier',
            'co_assigned_to' => 'second membre du suivi',
        ];
    }
}

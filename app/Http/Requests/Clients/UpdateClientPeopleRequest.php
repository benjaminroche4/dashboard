<?php

declare(strict_types=1);

namespace App\Http\Requests\Clients;

use App\Support\PhoneNumber;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

/**
 * Qui est sur le dossier : le second locataire et le membre qui le suit. Les
 * revenus et la situation professionnelle vivent sur la fiche de chaque
 * locataire (`clients.tenant-profile`), avec l'employeur et le titre de séjour.
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
            'assigned_to' => ['nullable', 'integer', 'exists:users,id'],
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
            'assigned_to' => 'membre qui suit le dossier',
        ];
    }
}

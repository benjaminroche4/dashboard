<?php

declare(strict_types=1);

namespace App\Http\Requests\Owners;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

/**
 * Propriétaires collés depuis un tableur : chaque ligne nomme au moins une
 * personne ou une société, et porte un e-mail ou un téléphone.
 */
class ImportOwnersRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'rows' => ['required', 'array', 'min:1', 'max:500'],
            'rows.*.first_name' => ['nullable', 'string', 'max:255'],
            'rows.*.last_name' => ['nullable', 'string', 'max:255'],
            'rows.*.company' => ['nullable', 'string', 'max:255'],
            'rows.*.email' => ['nullable', 'email', 'max:255'],
            'rows.*.phone' => ['nullable', 'string', 'max:40'],
            'rows.*.street' => ['nullable', 'string', 'max:255'],
            'rows.*.postal_code' => ['nullable', 'string', 'max:20'],
            'rows.*.city' => ['nullable', 'string', 'max:255'],
        ];
    }

    /**
     * @return list<callable>
     */
    public function after(): array
    {
        return [function (Validator $validator): void {
            /** @var array<int, array<string, mixed>> $rows */
            $rows = $this->validated('rows') ?? [];

            foreach ($rows as $index => $row) {
                if (trim((string) ($row['last_name'] ?? '')) === '' && trim((string) ($row['company'] ?? '')) === '') {
                    $validator->errors()->add("rows.{$index}.last_name", __('Chaque ligne doit porter un nom ou une raison sociale.'));
                }

                if (trim((string) ($row['email'] ?? '')) === '' && trim((string) ($row['phone'] ?? '')) === '') {
                    $validator->errors()->add("rows.{$index}.email", __('Chaque ligne doit porter un e-mail ou un téléphone.'));
                }
            }
        }];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'rows' => 'lignes',
            'rows.*.first_name' => 'prénom',
            'rows.*.last_name' => 'nom',
            'rows.*.company' => 'société',
            'rows.*.email' => 'e-mail',
            'rows.*.phone' => 'téléphone',
            'rows.*.street' => 'rue',
            'rows.*.postal_code' => 'code postal',
            'rows.*.city' => 'ville',
        ];
    }
}

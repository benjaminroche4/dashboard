<?php

declare(strict_types=1);

namespace App\Http\Requests\Owners;

use App\Models\Owner;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

/**
 * Modification en place d'un ou plusieurs champs d'un propriétaire depuis
 * sa fiche (29 octobre 2026) : seuls les champs envoyés sont validés et
 * écrits, et le propriétaire garde toujours un e-mail ou un téléphone.
 */
class UpdateOwnerFieldsRequest extends FormRequest
{
    /** Champs modifiables en place, avec leur nom lisible pour le journal. */
    public const array FIELDS = [
        'phone' => 'le téléphone',
        'email' => 'l’e-mail',
        'company' => 'la société',
        'street' => 'l’adresse',
        'postal_code' => 'l’adresse',
        'city' => 'l’adresse',
        'notes' => 'les notes',
    ];

    public function authorize(): bool
    {
        /** @var Owner|null $owner */
        $owner = $this->route('owner');

        return $owner !== null && ($this->user()?->can('update', $owner) ?? false);
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'phone' => ['sometimes', 'nullable', 'string', 'max:40'],
            'email' => ['sometimes', 'nullable', 'email', 'max:255'],
            'company' => ['sometimes', 'nullable', 'string', 'max:255'],
            'street' => ['sometimes', 'nullable', 'string', 'max:255'],
            'postal_code' => ['sometimes', 'nullable', 'string', 'max:20'],
            'city' => ['sometimes', 'nullable', 'string', 'max:255'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:20000'],
        ];
    }

    /**
     * Effacer le dernier moyen de joindre le propriétaire est refusé.
     *
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                /** @var Owner|null $owner */
                $owner = $this->route('owner');

                if ($owner === null) {
                    return;
                }

                $email = $this->has('email') ? trim((string) $this->input('email')) : (string) $owner->email;
                $phone = $this->has('phone') ? trim((string) $this->input('phone')) : (string) $owner->phone;

                if ($email === '' && $phone === '') {
                    $validator->errors()->add($this->has('email') ? 'email' : 'phone', 'Le propriétaire doit garder un e-mail ou un téléphone.');
                }
            },
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return (new StoreOwnerRequest)->attributes();
    }

    /**
     * Les champs envoyés, et eux seuls.
     *
     * @return array<string, mixed>
     */
    public function fields(): array
    {
        return array_intersect_key($this->validated(), self::FIELDS);
    }
}

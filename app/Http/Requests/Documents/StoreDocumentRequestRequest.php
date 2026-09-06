<?php

declare(strict_types=1);

namespace App\Http\Requests\Documents;

use App\Enums\HouseholdRole;
use App\Enums\LeadLanguage;
use App\Support\DocumentCatalog;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreDocumentRequestRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'lead_id' => ['nullable', 'integer', 'exists:leads,id'],
            'language' => ['required', Rule::enum(LeadLanguage::class)],
            'message' => ['nullable', 'string', 'max:3000'],
            'upload_url' => ['required', 'url:https', 'max:2048'],
            'persons' => ['required', 'array', 'min:1', 'max:4'],
            'persons.*.first_name' => ['required', 'string', 'max:255'],
            'persons.*.last_name' => ['required', 'string', 'max:255'],
            'persons.*.role' => ['required', Rule::enum(HouseholdRole::class)],
            'persons.*.documents' => ['required', 'array', 'min:1'],
            'persons.*.documents.*' => ['required', 'string', Rule::in(DocumentCatalog::keys())],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'lead_id' => 'lead',
            'language' => 'langue',
            'message' => 'message',
            'upload_url' => 'lien de dépôt',
            'persons' => 'personnes du foyer',
            'persons.*.first_name' => 'prénom',
            'persons.*.last_name' => 'nom',
            'persons.*.role' => 'rôle',
            'persons.*.documents' => 'pièces demandées',
            'persons.*.documents.*' => 'pièce',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'upload_url.url' => __('Le lien de dépôt doit être une adresse https valide.'),
            'persons.max' => __('Quatre personnes au maximum.'),
            'persons.*.first_name.required' => __('Le prénom est obligatoire.'),
            'persons.*.last_name.required' => __('Le nom est obligatoire.'),
            'persons.*.documents.required' => __('Cochez au moins une pièce pour cette personne.'),
            'persons.*.documents.min' => __('Cochez au moins une pièce pour cette personne.'),
        ];
    }
}

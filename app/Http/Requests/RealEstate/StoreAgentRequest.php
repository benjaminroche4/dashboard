<?php

declare(strict_types=1);

namespace App\Http\Requests\RealEstate;

use App\Enums\AgentPosition;
use App\Enums\RelationshipQuality;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAgentRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'agency_id' => ['nullable', 'integer', 'exists:agencies,id'],
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'position' => ['nullable', Rule::enum(AgentPosition::class)],
            'relationship_quality' => ['nullable', Rule::enum(RelationshipQuality::class)],
            'street' => ['nullable', 'string', 'max:255'],
            'postal_code' => ['nullable', 'string', 'max:20'],
            'city' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:40'],
            'is_primary' => ['nullable', 'boolean'],
            'notes' => ['nullable', 'string', 'max:3000'],
            // Prévenir le contact par e-mail qu'il rejoint l'annuaire (décoché par défaut).
            'notify' => ['nullable', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'agency_id' => 'agence',
            'first_name' => 'prénom',
            'last_name' => 'nom',
            'position' => 'fonction',
            'relationship_quality' => 'qualité de la relation',
            'street' => 'adresse',
            'postal_code' => 'code postal',
            'city' => 'ville',
            'email' => 'e-mail',
            'phone' => 'téléphone',
            'is_primary' => 'agent principal',
            'notes' => 'notes',
        ];
    }
}

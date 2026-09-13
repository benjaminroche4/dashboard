<?php

declare(strict_types=1);

namespace App\Http\Requests\Visits;

use App\Enums\VisitStatus;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateVisitRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'status' => ['nullable', Rule::enum(VisitStatus::class)],
            'scheduled_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:3000'],
            'property_id' => ['nullable', 'integer', 'exists:properties,id'],
            'agent_id' => ['nullable', 'integer', 'exists:agents,id'],
            'assigned_to' => ['nullable', 'integer', 'exists:users,id'],
            // Le formulaire de modification demande à revenir sur la fiche ;
            // les actions de la liste, elles, ne bougent pas de la liste.
            'return_to' => ['nullable', 'in:show'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'return_to' => 'retour',
            'status' => 'statut',
            'scheduled_at' => 'date de la visite',
            'notes' => 'notes',
            'property_id' => 'bien à visiter',
            'agent_id' => 'agent immobilier',
            'assigned_to' => 'membre qui réalise la visite',
        ];
    }
}

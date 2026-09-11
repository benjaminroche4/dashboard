<?php

declare(strict_types=1);

namespace App\Http\Requests\Visits;

use App\Enums\VisitMode;
use App\Enums\VisitStatus;
use App\Models\Visit;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateVisitRequest extends FormRequest
{
    /**
     * La visite autonome reste réservée à la formule « Accompagné ».
     *
     * @return list<callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $mode = VisitMode::tryFrom((string) $this->input('mode', ''));
                /** @var Visit|null $visit */
                $visit = $this->route('visit');

                if ($mode !== null && ! $mode->allowedFor($visit?->lead->offer)) {
                    $validator->errors()->add('mode', __('La visite autonome est réservée aux clients de la formule Accompagné.'));
                }
            },
        ];
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'status' => ['nullable', Rule::enum(VisitStatus::class)],
            'mode' => ['nullable', Rule::enum(VisitMode::class)],
            'scheduled_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:3000'],
            'property_id' => ['nullable', 'integer', 'exists:properties,id'],
            'agent_id' => ['nullable', 'integer', 'exists:agents,id'],
            'assigned_to' => ['nullable', 'integer', 'exists:users,id'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'status' => 'statut',
            'mode' => 'type de visite',
            'scheduled_at' => 'date de la visite',
            'notes' => 'notes',
            'property_id' => 'bien à visiter',
            'agent_id' => 'agent immobilier',
            'assigned_to' => 'membre qui réalise la visite',
        ];
    }
}

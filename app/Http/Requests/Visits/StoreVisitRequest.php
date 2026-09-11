<?php

declare(strict_types=1);

namespace App\Http\Requests\Visits;

use App\Enums\LeadStatus;
use App\Enums\Offer;
use App\Enums\VisitMode;
use App\Http\Requests\Properties\StorePropertyRequest;
use App\Models\Lead;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreVisitRequest extends FormRequest
{
    /**
     * Le bien est soit choisi dans l'annuaire (`property_id`), soit saisi (`property.*`).
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $creating = $this->input('property_id') === null || $this->input('property_id') === '';
        $propertyRules = StorePropertyRequest::propertyRules('property.');
        $propertyRules['property.street'] = [Rule::requiredIf($creating), 'string', 'max:255'];
        // L'arrondissement est obligatoire pour un nouveau bien, sauf s'il se déduit d'un code postal parisien.
        $propertyRules['property.district'] = [Rule::requiredIf($creating && preg_match('/^750\d{2}$/', (string) $this->input('property.postal_code')) !== 1), 'nullable', 'integer', 'min:1', 'max:20'];

        // Formule « Confié » : l'équipe visite sans le client, un membre doit donc s'en charger.
        $entrusted = $this->client()?->offer === Offer::Confie;

        return [
            // Une visite se planifie pour un client (lead converti), jamais pour un simple lead.
            'lead_id' => ['required', 'integer', Rule::exists('leads', 'id')->where('status', LeadStatus::Converted->value)],
            'property_id' => ['nullable', 'integer', Rule::exists('properties', 'id')],
            'property' => [Rule::requiredIf($creating), 'array'],
            ...$propertyRules,
            'agent_id' => ['nullable', 'integer', Rule::exists('agents', 'id')],
            'assigned_to' => [Rule::requiredIf($entrusted), 'nullable', 'integer', Rule::exists('users', 'id')],
            'scheduled_at' => ['required', 'date'],
            'mode' => ['nullable', Rule::enum(VisitMode::class)],
            'notes' => ['nullable', 'string', 'max:3000'],
            // Informer le client par e-mail (décoché par défaut).
            'notify_client' => ['nullable', 'boolean'],
        ];
    }

    /**
     * La visite autonome suppose un client sur place : elle n'est possible que
     * sur la formule « Accompagné ».
     *
     * @return list<callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $mode = VisitMode::tryFrom((string) $this->input('mode', ''));

                if ($mode !== null && ! $mode->allowedFor($this->client()?->offer)) {
                    $validator->errors()->add('mode', __('La visite autonome est réservée aux clients de la formule Accompagné.'));
                }
            },
        ];
    }

    /** Client de la visite, pour connaître sa formule. */
    public function client(): ?Lead
    {
        $id = $this->input('lead_id');

        return is_numeric($id) ? Lead::query()->find((int) $id) : null;
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'lead_id' => 'client',
            'property_id' => 'bien',
            'property' => 'bien',
            ...StorePropertyRequest::propertyAttributes('property.'),
            'agent_id' => 'agent immobilier',
            'assigned_to' => 'membre qui réalise la visite',
            'scheduled_at' => 'date de la visite',
            'mode' => 'type de visite',
            'notes' => 'notes',
            'notify_client' => 'information du client',
        ];
    }
}

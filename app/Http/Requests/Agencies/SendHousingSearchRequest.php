<?php

declare(strict_types=1);

namespace App\Http\Requests\Agencies;

use App\Models\Agency;
use App\Models\Agent;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * Envoi de la recherche d'un client à une agence ou à un agent : le destinataire
 * doit être l'adresse de l'agence ou de l'un de ses agents (le mot décrit le
 * projet d'un client, il ne part pas vers une adresse libre).
 */
class SendHousingSearchRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'agency_id' => ['nullable', 'integer', Rule::exists('agencies', 'id'), 'required_without:agent_id'],
            'agent_id' => ['nullable', 'integer', Rule::exists('agents', 'id'), 'required_without:agency_id'],
            'email' => ['required', 'email', 'max:255'],
            'message' => ['required', 'string', 'min:20', 'max:5000'],
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $email = strtolower((string) $this->input('email'));
                $agency = $this->agency();
                $agent = $this->agent();

                $allowed = array_map(strtolower(...), array_filter([
                    $agency?->email,
                    $agent?->email,
                    ...($agency?->agents->pluck('email')->all() ?? []),
                ]));

                if ($email !== '' && ! in_array($email, $allowed, true)) {
                    $validator->errors()->add('email', 'Le destinataire doit être l’adresse de l’agence ou de l’un de ses agents.');
                }
            },
        ];
    }

    public function agency(): ?Agency
    {
        $id = $this->input('agency_id');

        if ($id === null || $id === '') {
            return $this->agent()?->agency;
        }

        return Agency::query()->with('agents')->find((int) $id);
    }

    public function agent(): ?Agent
    {
        $id = $this->input('agent_id');

        return $id === null || $id === '' ? null : Agent::query()->with('agency.agents')->find((int) $id);
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return ['email' => 'destinataire', 'message' => 'message', 'agency_id' => 'agence', 'agent_id' => 'agent'];
    }
}

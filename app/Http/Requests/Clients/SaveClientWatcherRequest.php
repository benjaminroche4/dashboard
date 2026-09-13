<?php

declare(strict_types=1);

namespace App\Http\Requests\Clients;

use App\Models\Lead;
use App\Models\LeadWatcher;
use App\Support\PhoneNumber;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/** Personne de suivi : un nom et une adresse, rien d'autre. */
class SaveClientWatcherRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var Lead|null $lead */
        $lead = $this->route('lead');
        /** @var LeadWatcher|null $watcher */
        $watcher = $this->route('watcher');

        return [
            'name' => ['required', 'string', 'max:255'],
            // Une même adresse ne suit pas deux fois le même dossier.
            'email' => [
                'required', 'email', 'max:255',
                Rule::unique('lead_watchers', 'email')
                    ->where('lead_id', $lead?->id)
                    ->ignore($watcher?->id),
            ],
            'phone' => ['nullable', 'string', 'max:40'],
            'role' => ['nullable', 'string', 'max:255'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return ['name' => 'nom', 'email' => 'adresse e-mail', 'phone' => 'téléphone', 'role' => 'lien avec le client'];
    }

    /**
     * Un numéro saisi doit pouvoir être appelé.
     *
     * @return list<callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $phone = $this->string('phone')->trim()->value();

                if ($phone !== '' && PhoneNumber::e164($phone) === null) {
                    $validator->errors()->add('phone', __('Ce numéro de téléphone n’est pas valide.'));
                }
            },
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return ['email.unique' => __('Cette adresse suit déjà ce dossier.')];
    }
}

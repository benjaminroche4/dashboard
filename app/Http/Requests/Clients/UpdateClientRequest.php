<?php

declare(strict_types=1);

namespace App\Http\Requests\Clients;

use App\Enums\Currency;
use App\Enums\Furnished;
use App\Enums\GuarantorType;
use App\Enums\LeadDuration;
use App\Enums\LeadLanguage;
use App\Enums\Offer;
use App\Enums\PropertyType;
use App\Models\Lead;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Modification d'un dossier client : ses coordonnées et son projet de
 * logement. Le dossier se modifie **sans passer par la fiche lead** — la
 * qualification, la source et la note du lead n'y figurent donc pas.
 */
class UpdateClientRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var Lead|null $lead */
        $lead = $this->route('lead');

        return $lead !== null && ($this->user()?->can('update', $lead) ?? false);
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            // Un dossier sans moyen de joindre le client ne sert à rien.
            'email' => ['nullable', 'email', 'max:255', 'required_without:phone'],
            'phone' => ['nullable', 'string', 'max:40', 'required_without:email'],
            'company' => ['nullable', 'string', 'max:120'],
            'language' => ['nullable', Rule::enum(LeadLanguage::class)],
            'offer' => ['nullable', Rule::enum(Offer::class)],
            'budget_cents' => ['nullable', 'integer', 'min:0'],
            'currency' => ['nullable', Rule::enum(Currency::class)],
            'arrival_at' => ['nullable', 'date'],
            'districts' => ['nullable', 'array', 'max:20'],
            'districts.*' => ['integer', 'between:1,20', 'distinct'],
            'property_types' => ['nullable', 'array'],
            'property_types.*' => [Rule::enum(PropertyType::class), 'distinct'],
            'duration' => ['nullable', Rule::enum(LeadDuration::class)],
            'guarantors' => ['nullable', 'array'],
            'guarantors.*' => [Rule::enum(GuarantorType::class), 'distinct'],
            'furnished' => ['nullable', Rule::enum(Furnished::class)],
            'origin_city' => ['nullable', 'string', 'max:120'],
            'message' => ['nullable', 'string', 'max:5000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'first_name' => 'prénom',
            'last_name' => 'nom',
            'email' => 'e-mail',
            'phone' => 'téléphone',
            'company' => 'société',
            'language' => 'langue',
            'offer' => 'formule',
            'budget_cents' => 'budget',
            'currency' => 'devise',
            'arrival_at' => "date d'emménagement",
            'districts' => 'arrondissements',
            'property_types' => 'types de bien',
            'duration' => "durée d'installation",
            'guarantors' => 'garants',
            'furnished' => 'meublé',
            'origin_city' => "ville d'origine",
            'message' => 'note sur le projet',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'email.required_without' => 'Indiquez au moins un e-mail ou un téléphone.',
            'phone.required_without' => 'Indiquez au moins un e-mail ou un téléphone.',
        ];
    }
}

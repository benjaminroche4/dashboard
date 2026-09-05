<?php

declare(strict_types=1);

namespace App\Http\Requests\Leads;

use App\Enums\Currency;
use App\Enums\Furnished;
use App\Enums\GuarantorType;
use App\Enums\LeadDuration;
use App\Enums\LeadLanguage;
use App\Enums\LeadSource;
use App\Enums\Offer;
use App\Enums\PropertyType;
use App\Enums\RecontactChannel;
use App\Models\Lead;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreLeadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', Lead::class) ?? false;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'email' => ['nullable', 'email', 'max:255', 'required_without:phone'],
            'phone' => ['nullable', 'string', 'max:40', 'required_without:email'],
            'company' => ['nullable', 'string', 'max:120'],
            'language' => ['nullable', Rule::enum(LeadLanguage::class)],
            'offer' => ['nullable', Rule::enum(Offer::class)],
            'source' => ['nullable', Rule::enum(LeadSource::class)],
            'source_note' => ['nullable', 'string', 'max:255'],
            'budget_cents' => ['nullable', 'integer', 'min:0'],
            'currency' => ['nullable', Rule::enum(Currency::class)],
            'arrival_at' => ['nullable', 'date'],
            'districts' => ['nullable', 'array', 'max:20'],
            'districts.*' => ['integer', 'between:1,20', 'distinct'],
            'property_types' => ['nullable', 'array'],
            'property_types.*' => [Rule::enum(PropertyType::class), 'distinct'],
            'duration' => ['nullable', Rule::enum(LeadDuration::class)],
            'guarantor' => ['nullable', Rule::enum(GuarantorType::class)],
            'furnished' => ['nullable', Rule::enum(Furnished::class)],
            'origin_city' => ['nullable', 'string', 'max:120'],
            'message' => ['nullable', 'string', 'max:5000'],
            'score' => ['nullable', 'integer', 'between:1,5'],
            'recontact_channel' => ['nullable', Rule::enum(RecontactChannel::class)],
            'recontact_at' => ['nullable', 'date'],
            'qualification_note' => ['nullable', 'string', 'max:5000'],
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
            'source' => 'source',
            'source_note' => 'note sur la source',
            'budget_cents' => 'budget',
            'currency' => 'devise',
            'arrival_at' => "date d'emménagement",
            'districts' => 'arrondissements',
            'property_types' => 'types de bien',
            'duration' => "durée d'installation",
            'guarantor' => 'garant',
            'furnished' => 'meublé',
            'origin_city' => "ville d'origine",
            'message' => 'note sur le projet',
            'score' => 'qualité du lead',
            'recontact_channel' => 'canal de recontact',
            'recontact_at' => 'date de recontact',
            'qualification_note' => 'note de qualification',
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

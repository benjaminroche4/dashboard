<?php

declare(strict_types=1);

namespace App\Http\Requests\Leads;

use App\Enums\Currency;
use App\Enums\LeadSource;
use App\Enums\Offer;
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
            'offer' => ['nullable', Rule::enum(Offer::class)],
            'arrival_at' => ['nullable', 'date'],
            'budget_cents' => ['nullable', 'integer', 'min:0'],
            'currency' => ['nullable', Rule::enum(Currency::class)],
            'origin_city' => ['nullable', 'string', 'max:120'],
            'source' => ['nullable', Rule::enum(LeadSource::class)],
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
            'offer' => 'offre',
            'arrival_at' => "date d'arrivée",
            'budget_cents' => 'budget',
            'currency' => 'devise',
            'origin_city' => "ville d'origine",
            'source' => 'source',
            'message' => 'message',
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

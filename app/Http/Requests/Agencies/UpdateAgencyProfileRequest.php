<?php

declare(strict_types=1);

namespace App\Http\Requests\Agencies;

use App\Enums\AgencySpecialty;
use App\Enums\MandateType;
use App\Enums\SpokenLanguage;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Profil de matching d'une agence : tout facultatif, jamais exigé. */
class UpdateAgencyProfileRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'districts' => ['nullable', 'array'],
            'districts.*' => ['integer', 'between:1,20'],
            'specialties' => ['nullable', 'array'],
            'specialties.*' => [Rule::enum(AgencySpecialty::class)],
            'languages' => ['nullable', 'array'],
            'languages.*' => [Rule::enum(SpokenLanguage::class)],
            'mandate_types' => ['nullable', 'array'],
            'mandate_types.*' => [Rule::enum(MandateType::class)],
            'fee_note' => ['nullable', 'string', 'max:255'],
            'rent_min_cents' => ['nullable', 'integer', 'min:0', 'max:100000000'],
            'rent_max_cents' => ['nullable', 'integer', 'min:0', 'max:100000000'],
            'accepts_garantme' => ['nullable', 'boolean'],
            'accepts_foreign_files' => ['nullable', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'districts' => 'quartiers couverts',
            'specialties' => 'spécialités',
            'languages' => 'langues',
            'mandate_types' => 'mandats',
            'fee_note' => 'frais d’agence',
            'rent_min_cents' => 'loyer minimum',
            'rent_max_cents' => 'loyer maximum',
        ];
    }
}

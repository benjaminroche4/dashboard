<?php

declare(strict_types=1);

namespace App\Http\Requests\Agencies;

use App\Enums\AgencySpecialty;
use App\Enums\SpokenLanguage;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Profil de matching d'un agent : quartiers, spécialités, langues — le reste vient de son agence. */
class UpdateAgentProfileRequest extends FormRequest
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
        ];
    }
}

<?php

declare(strict_types=1);

namespace App\Http\Requests\Leads;

use App\Data\LeadQualificationData;
use App\Models\Lead;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ApplyLeadQualificationRequest extends FormRequest
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
            // Absent = tout appliquer ; sinon la liste des champs retenus.
            'fields' => ['nullable', 'array'],
            'fields.*' => ['string', Rule::in(LeadQualificationData::FIELDS)],
        ];
    }
}

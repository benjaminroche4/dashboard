<?php

declare(strict_types=1);

namespace App\Http\Requests\Leads;

use App\Enums\LeadSegment;
use App\Models\Lead;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class MoveLeadSegmentRequest extends FormRequest
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
        return ['segment' => ['required', Rule::enum(LeadSegment::class)]];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return ['segment' => 'liste'];
    }
}

<?php

declare(strict_types=1);

namespace App\Http\Requests\Leads;

use App\Enums\RecontactChannel;
use App\Models\Lead;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ScheduleLeadRecontactRequest extends FormRequest
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
            'recontact_at' => ['nullable', 'date'],
            'recontact_channel' => ['nullable', 'required_with:recontact_at', Rule::enum(RecontactChannel::class)],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return ['recontact_at' => 'date de recontact', 'recontact_channel' => 'canal'];
    }
}

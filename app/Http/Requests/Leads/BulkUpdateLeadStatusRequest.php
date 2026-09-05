<?php

declare(strict_types=1);

namespace App\Http\Requests\Leads;

use App\Enums\LeadStatus;
use App\Models\Lead;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BulkUpdateLeadStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('update', Lead::class) ?? false;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'ids' => ['required', 'array', 'min:1', 'max:200'],
            'ids.*' => ['integer', 'distinct', Rule::exists('leads', 'id')],
            'status' => ['required', Rule::enum(LeadStatus::class)],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return ['ids' => 'leads', 'status' => 'statut'];
    }
}

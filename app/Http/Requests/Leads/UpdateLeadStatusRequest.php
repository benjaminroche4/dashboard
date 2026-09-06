<?php

declare(strict_types=1);

namespace App\Http\Requests\Leads;

use App\Enums\LeadLossReason;
use App\Enums\LeadStatus;
use App\Models\Lead;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateLeadStatusRequest extends FormRequest
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
            'status' => ['required', Rule::enum(LeadStatus::class)],
            'position' => ['nullable', 'integer', 'min:0'],
            // À l'archivage seulement : pourquoi le lead n'a pas abouti.
            'loss_reason' => ['nullable', 'required_if:status,'.LeadStatus::Archived->value, Rule::enum(LeadLossReason::class)],
            'loss_note' => ['nullable', 'string', 'max:500'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return ['status' => 'statut', 'position' => 'position', 'loss_reason' => 'motif', 'loss_note' => 'précision'];
    }
}

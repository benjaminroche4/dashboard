<?php

declare(strict_types=1);

namespace App\Http\Requests\Partners;

use App\Enums\PartnerRole;
use App\Models\Lead;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AttachLeadPartnerRequest extends FormRequest
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
            'partner_id' => ['required', 'integer', Rule::exists('partners', 'id')],
            'role' => ['required', Rule::enum(PartnerRole::class)],
            'note' => ['nullable', 'string', 'max:500'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return ['partner_id' => 'partenaire', 'role' => 'rôle', 'note' => 'précision'];
    }
}

<?php

declare(strict_types=1);

namespace App\Http\Requests\Properties;

use App\Enums\LeadStatus;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Database\Query\Builder;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Attribution d'un bien à un client : `lead_id` vide le libère. */
class AssignPropertyRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            // Un bien s'attribue à un client, c'est-à-dire à un lead converti.
            'lead_id' => [
                'nullable',
                'integer',
                Rule::exists('leads', 'id')->where(fn (Builder $query) => $query->where('status', LeadStatus::Converted->value)),
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return ['lead_id' => 'client'];
    }
}

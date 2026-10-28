<?php

declare(strict_types=1);

namespace App\Http\Requests\Leads;

use App\Models\Lead;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/** Qualification posée à la main depuis la fiche : la note sur 5 et le commentaire. */
class QualifyLeadRequest extends FormRequest
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
            'score' => ['nullable', 'integer', 'between:1,5'],
            'qualification_note' => ['nullable', 'string', 'max:20000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return ['score' => 'qualité du lead', 'qualification_note' => 'note de qualification'];
    }
}

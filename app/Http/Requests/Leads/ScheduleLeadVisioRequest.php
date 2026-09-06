<?php

declare(strict_types=1);

namespace App\Http\Requests\Leads;

use Carbon\CarbonImmutable;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ScheduleLeadVisioRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            // Heure de Paris, saisie « AAAA-MM-JJTHH:MM » par le champ datetime-local.
            'visio_at' => ['required', 'date_format:Y-m-d\TH:i', 'after:now'],
        ];
    }

    public function visioAt(): CarbonImmutable
    {
        return CarbonImmutable::createFromFormat('Y-m-d\TH:i', (string) $this->validated('visio_at'), 'Europe/Paris') ?: CarbonImmutable::now();
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return ['visio_at' => 'date de la visio'];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return ['visio_at.after' => __('La visio doit être programmée dans le futur.')];
    }
}

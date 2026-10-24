<?php

declare(strict_types=1);

namespace App\Http\Requests\Companies;

use App\Models\Lead;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

/**
 * Rattache un dossier client à une entreprise : seul un lead qui est (ou fut)
 * un client peut l'être, un lead en cours ne l'est pas.
 */
class AttachCompanyClientRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'lead_id' => ['required', 'integer', 'exists:leads,id'],
        ];
    }

    /**
     * @return list<Closure(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->has('lead_id')) {
                    return;
                }

                if (! $this->lead()->isClient()) {
                    $validator->errors()->add('lead_id', 'Seul un dossier client peut être rattaché à une entreprise.');
                }
            },
        ];
    }

    public function lead(): Lead
    {
        return Lead::query()->findOrFail((int) $this->input('lead_id'));
    }
}

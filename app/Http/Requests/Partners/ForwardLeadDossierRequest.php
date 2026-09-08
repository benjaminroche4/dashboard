<?php

declare(strict_types=1);

namespace App\Http\Requests\Partners;

use App\Models\Lead;
use App\Models\LeadPartner;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ForwardLeadDossierRequest extends FormRequest
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
            // Le dossier (coordonnées, projet) ne part qu'au partenaire lui-même ou à
            // l'un de ses interlocuteurs enregistrés, jamais à une adresse libre.
            'email' => ['required', 'email', 'max:255', function (string $attribute, mixed $value, Closure $fail): void {
                $link = $this->route('partnerLink');

                if (! $link instanceof LeadPartner) {
                    return;
                }

                $allowed = array_map(mb_strtolower(...), array_filter([$link->partner->email, ...$link->partner->contacts->pluck('email')->all()]));

                if (! in_array(mb_strtolower((string) $value), $allowed, true)) {
                    $fail(__("Le destinataire doit être l'adresse du partenaire ou de l'un de ses interlocuteurs."));
                }
            }],
            'message' => ['nullable', 'string', 'max:2000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return ['email' => 'destinataire', 'message' => 'message'];
    }
}

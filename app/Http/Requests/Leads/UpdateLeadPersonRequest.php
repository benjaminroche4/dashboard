<?php

declare(strict_types=1);

namespace App\Http\Requests\Leads;

use App\Enums\EmploymentStatus;
use App\Enums\LeadSegment;
use App\Enums\TenantSlot;
use App\Models\Lead;
use App\Support\PhoneNumber;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * Une personne du lead (le lead lui-même ou la seconde personne du foyer),
 * modifiée en place depuis la section « Personnes » de la fiche : seuls les
 * champs envoyés sont validés et écrits. L'identité (prénom, nom, e-mail,
 * téléphone) ne se modifie ici que pour la seconde personne : celle du lead
 * vit dans son contact.
 */
class UpdateLeadPersonRequest extends FormRequest
{
    /** Champs modifiables, avec leur nom lisible pour le journal. */
    public const array FIELDS = [
        'first_name' => 'le prénom',
        'last_name' => 'le nom',
        'email' => "l'e-mail",
        'phone' => 'le téléphone',
        'employment_status' => 'la situation professionnelle',
        'employer' => "l'employeur",
        'income_cents' => 'le revenu',
    ];

    /** Champs d'identité, réservés à la seconde personne. */
    public const array IDENTITY = ['first_name', 'last_name', 'email', 'phone'];

    public function authorize(): bool
    {
        /** @var Lead|null $lead */
        $lead = $this->route('lead');

        return $lead !== null
            && LeadSegment::fromLead($lead) === LeadSegment::Tenant
            && ($this->user()?->can('update', $lead) ?? false);
    }

    /** Emplacement visé par la route, 404 s'il est inconnu. */
    public function slot(): TenantSlot
    {
        $slot = TenantSlot::tryFrom((string) $this->route('slot'));
        abort_if($slot === null, 404);

        return $slot;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $co = $this->slot() === TenantSlot::Co;

        return [
            // La seconde personne porte toujours un prénom et un nom.
            'first_name' => $co ? ['sometimes', 'required', 'string', 'max:255'] : ['prohibited'],
            'last_name' => $co ? ['sometimes', 'required', 'string', 'max:255'] : ['prohibited'],
            'email' => $co ? ['sometimes', 'nullable', 'email', 'max:255'] : ['prohibited'],
            'phone' => $co ? ['sometimes', 'nullable', 'string', 'max:40'] : ['prohibited'],
            'employment_status' => ['sometimes', 'nullable', Rule::enum(EmploymentStatus::class)],
            'employer' => ['sometimes', 'nullable', 'string', 'max:255'],
            'income_cents' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:100000000'],
        ];
    }

    /**
     * @return list<callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $phone = $this->string('phone')->trim()->value();

                if ($phone !== '' && PhoneNumber::e164($phone) === null) {
                    $validator->errors()->add('phone', __('Ce numéro de téléphone n’est pas valide.'));
                }
            },
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'first_name' => 'prénom',
            'last_name' => 'nom',
            'email' => 'e-mail',
            'phone' => 'téléphone',
            'employment_status' => 'situation professionnelle',
            'employer' => 'employeur',
            'income_cents' => 'revenu net mensuel',
        ];
    }

    /**
     * Les champs envoyés, et eux seuls.
     *
     * @return array<string, mixed>
     */
    public function fields(): array
    {
        return array_intersect_key($this->validated(), self::FIELDS);
    }
}

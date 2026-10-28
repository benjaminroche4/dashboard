<?php

declare(strict_types=1);

namespace App\Http\Requests\Leads;

use App\Enums\Currency;
use App\Enums\EmploymentStatus;
use App\Enums\Furnished;
use App\Enums\GuarantorType;
use App\Enums\LeadDuration;
use App\Enums\LeadLanguage;
use App\Enums\LeadSource;
use App\Enums\Offer;
use App\Enums\PropertyType;
use App\Models\Lead;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * Modification en place d'un ou plusieurs champs du projet depuis la fiche :
 * seuls les champs envoyés sont validés et écrits, avec les règles de la
 * Converting Machine (`StoreLeadRequest`).
 */
class UpdateLeadFieldsRequest extends FormRequest
{
    /** Champs modifiables en place, avec leur nom lisible pour le journal. */
    public const array FIELDS = [
        'email' => 'l’e-mail',
        'phone' => 'le téléphone',
        'company' => 'la société',
        'language' => 'la langue',
        'offer' => 'la formule',
        'budget_cents' => 'le budget',
        'currency' => 'la devise',
        'arrival_at' => "la date d'emménagement",
        'districts' => 'les quartiers',
        'property_types' => 'le type de bien',
        'duration' => "la durée d'installation",
        'guarantors' => 'le garant',
        'furnished' => 'le meublé',
        'origin_city' => "la ville d'origine",
        'origin_country' => "la ville d'origine",
        'employment_status' => 'la situation professionnelle',
        'message' => 'la note sur le projet',
        'project_notes' => 'les notes libres',
        'source' => 'la source',
        'source_note' => 'la précision sur la source',
    ];

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
            'email' => ['sometimes', 'nullable', 'email', 'max:255'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:40'],
            'company' => ['sometimes', 'nullable', 'string', 'max:120'],
            'language' => ['sometimes', Rule::enum(LeadLanguage::class)],
            'offer' => ['sometimes', 'nullable', Rule::enum(Offer::class)],
            'budget_cents' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'currency' => ['sometimes', Rule::enum(Currency::class)],
            'arrival_at' => ['sometimes', 'nullable', 'date'],
            'districts' => ['sometimes', 'nullable', 'array', 'max:20'],
            'districts.*' => ['integer', 'between:1,20', 'distinct'],
            'property_types' => ['sometimes', 'nullable', 'array'],
            'property_types.*' => [Rule::enum(PropertyType::class), 'distinct'],
            'duration' => ['sometimes', 'nullable', Rule::enum(LeadDuration::class)],
            'guarantors' => ['sometimes', 'nullable', 'array'],
            'guarantors.*' => [Rule::enum(GuarantorType::class), 'distinct'],
            'furnished' => ['sometimes', 'nullable', Rule::enum(Furnished::class)],
            'origin_city' => ['sometimes', 'nullable', 'string', 'max:120'],
            'origin_country' => ['sometimes', 'nullable', 'string', 'size:2', 'alpha'],
            'employment_status' => ['sometimes', 'nullable', Rule::enum(EmploymentStatus::class)],
            'message' => ['sometimes', 'nullable', 'string', 'max:20000'],
            'project_notes' => ['sometimes', 'nullable', 'string', 'max:20000'],
            'source' => ['sometimes', Rule::enum(LeadSource::class)],
            'source_note' => ['sometimes', 'nullable', 'string', 'max:255'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'email' => 'e-mail',
            'phone' => 'téléphone',
            'company' => 'société',
            'language' => 'langue',
            'offer' => 'formule',
            'budget_cents' => 'budget',
            'currency' => 'devise',
            'arrival_at' => "date d'emménagement",
            'districts' => 'arrondissements',
            'property_types' => 'types de bien',
            'duration' => "durée d'installation",
            'guarantors' => 'garants',
            'furnished' => 'meublé',
            'origin_city' => "ville d'origine",
            'origin_country' => "pays d'origine",
            'employment_status' => 'situation professionnelle',
            'message' => 'note sur le projet',
            'project_notes' => 'notes libres',
            'source' => 'source',
            'source_note' => 'précision sur la source',
        ];
    }

    /**
     * Rien d'autre que les champs connus, même validés par accident.
     *
     * @return array<string, mixed>
     */
    public function fields(): array
    {
        /** @var array<string, mixed> $validated */
        $validated = $this->validated();

        return array_intersect_key($validated, self::FIELDS);
    }

    /**
     * Un lead reste joignable : on ne peut pas effacer l'e-mail quand il n'a
     * pas de téléphone, ni l'inverse (la règle de la Converting Machine).
     *
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                /** @var Lead|null $lead */
                $lead = $this->route('lead');

                if ($lead === null || (! $this->has('email') && ! $this->has('phone'))) {
                    return;
                }

                $email = $this->has('email') ? trim((string) $this->input('email')) : (string) $lead->email;
                $phone = $this->has('phone') ? trim((string) $this->input('phone')) : (string) $lead->phone;

                if ($email === '' && $phone === '') {
                    $validator->errors()->add(
                        $this->has('email') ? 'email' : 'phone',
                        __('Le lead doit garder un e-mail ou un téléphone.'),
                    );
                }
            },
        ];
    }
}

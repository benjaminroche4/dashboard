<?php

declare(strict_types=1);

namespace App\Http\Requests\Companies;

use App\Models\Company;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * E-mail de suivi à une entreprise : objet et message libres, destinataires
 * choisis parmi les adresses déjà enregistrées (la sienne, ses contacts),
 * jamais une adresse libre.
 */
class SendCompanyFollowUpRequest extends FormRequest
{
    public const int MAX_RECIPIENTS = 5;

    public function authorize(): bool
    {
        $company = $this->route('company');

        return $company instanceof Company && ($this->user()?->can('update', $company) ?? false);
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'emails' => ['required', 'array', 'min:1', 'max:'.self::MAX_RECIPIENTS],
            'emails.*' => ['required', 'email:rfc', 'max:255', 'distinct', function (string $attribute, mixed $value, Closure $fail): void {
                if (! in_array(mb_strtolower((string) $value), $this->allowed(), true)) {
                    $fail(__("Le destinataire doit être l'adresse de l'entreprise ou de l'un de ses contacts."));
                }
            }],
            'subject' => ['required', 'string', 'min:3', 'max:150'],
            'message' => ['required', 'string', 'min:10', 'max:5000'],
        ];
    }

    /**
     * Adresses connues de l'entreprise, en minuscules.
     *
     * @return list<string>
     */
    public function allowed(): array
    {
        $company = $this->route('company');

        if (! $company instanceof Company) {
            return [];
        }

        return array_values(array_map(
            mb_strtolower(...),
            array_filter([$company->email, ...$company->contacts->pluck('email')->all()]),
        ));
    }

    /**
     * Destinataires validés, avec le nom à qui l'e-mail s'adresse.
     *
     * @return list<array{email: string, name: string}>
     */
    public function recipients(): array
    {
        $company = $this->route('company');
        /** @var list<string> $emails */
        $emails = $this->validated('emails');
        $names = [];

        if ($company instanceof Company) {
            foreach ($company->contacts as $contact) {
                if ($contact->email !== null) {
                    $names[mb_strtolower($contact->email)] = $contact->fullName();
                }
            }
            if ($company->email !== null) {
                $names[mb_strtolower($company->email)] ??= $company->name;
            }
        }

        return array_map(
            fn (string $email): array => [
                'email' => $email,
                'name' => $names[mb_strtolower($email)] ?? $email,
            ],
            $emails,
        );
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return ['emails' => 'destinataires', 'emails.*' => 'destinataire', 'subject' => 'objet', 'message' => 'message'];
    }
}

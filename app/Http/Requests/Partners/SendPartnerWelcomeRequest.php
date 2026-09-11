<?php

declare(strict_types=1);

namespace App\Http\Requests\Partners;

use App\Models\Partner;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Renvoi de l'e-mail de bienvenue : l'équipe choisit les destinataires parmi
 * les adresses déjà enregistrées du partenaire, jamais une adresse libre.
 */
class SendPartnerWelcomeRequest extends FormRequest
{
    public function authorize(): bool
    {
        $partner = $this->route('partner');

        return $partner instanceof Partner && ($this->user()?->can('update', $partner) ?? false);
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'emails' => ['required', 'array', 'min:1', 'max:5'],
            'emails.*' => ['required', 'email:rfc', 'max:255', 'distinct', function (string $attribute, mixed $value, Closure $fail): void {
                if (! in_array(mb_strtolower((string) $value), $this->allowed(), true)) {
                    $fail(__("Le destinataire doit être l'adresse du partenaire ou de l'un de ses interlocuteurs."));
                }
            }],
        ];
    }

    /**
     * Adresses connues du partenaire, en minuscules.
     *
     * @return list<string>
     */
    public function allowed(): array
    {
        $partner = $this->route('partner');

        if (! $partner instanceof Partner) {
            return [];
        }

        return array_values(array_map(
            mb_strtolower(...),
            array_filter([$partner->email, ...$partner->contacts->pluck('email')->all()]),
        ));
    }

    /**
     * Destinataires validés, avec le nom à qui l'e-mail s'adresse.
     *
     * @return list<array{email: string, name: string}>
     */
    public function recipients(): array
    {
        $partner = $this->route('partner');
        /** @var list<string> $emails */
        $emails = $this->validated('emails');
        $names = [];

        if ($partner instanceof Partner) {
            foreach ($partner->contacts as $contact) {
                if ($contact->email !== null) {
                    $names[mb_strtolower($contact->email)] = $contact->fullName();
                }
            }
            if ($partner->email !== null) {
                $names[mb_strtolower($partner->email)] ??= $partner->name;
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
        return ['emails' => 'destinataires', 'emails.*' => 'destinataire'];
    }
}

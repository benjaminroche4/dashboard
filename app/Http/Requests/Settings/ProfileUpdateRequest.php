<?php

declare(strict_types=1);

namespace App\Http\Requests\Settings;

use App\Concerns\ProfileValidationRules;
use App\Support\PersonName;
use App\Support\PhoneNumber;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ProfileUpdateRequest extends FormRequest
{
    use ProfileValidationRules;

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $rules = $this->profileRules($this->user()->id);
        // L'adresse sert d'expéditeur des e-mails aux leads quand son domaine est
        // vérifié : seul un administrateur peut la changer, pour empêcher un membre
        // de se faire passer pour une autre boîte du domaine.
        $rules['email'][] = function (string $attribute, mixed $value, Closure $fail): void {
            $user = $this->user();

            if ($user !== null && ! $user->isAdmin() && mb_strtolower((string) $value) !== mb_strtolower($user->email)) {
                $fail(__("Seul un administrateur peut modifier votre adresse e-mail. Demandez-le à l'équipe."));
            }
        };

        // Téléphone du membre, pour les alertes par SMS : facultatif, mais convertible en E.164 s'il est renseigné.
        $rules['phone'] = ['nullable', 'string', 'max:40', function (string $attribute, mixed $value, Closure $fail): void {
            if (is_string($value) && $value !== '' && PhoneNumber::e164($value) === null) {
                $fail(__('Le numéro de téléphone est invalide.'));
            }
        }];

        return $rules;
    }

    /**
     * Le nom affiché prend toujours une majuscule à chaque mot ; un téléphone vide devient null.
     */
    protected function prepareForValidation(): void
    {
        if (is_string($this->input('name'))) {
            $this->merge(['name' => PersonName::capitalize($this->input('name'))]);
        }

        if ($this->has('phone')) {
            $phone = trim((string) $this->input('phone'));
            $this->merge(['phone' => $phone === '' ? null : $phone]);
        }
    }
}

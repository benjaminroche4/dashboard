<?php

declare(strict_types=1);

namespace App\Http\Requests\Clients;

use App\Enums\EmploymentStatus;
use App\Enums\ResidencyStatus;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Détails d'un locataire du dossier : tout est facultatif, mais ce qui est
 * saisi doit être valide (dates, montant, listes fermées).
 */
class UpdateTenantProfileRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'birth_date' => ['nullable', 'date', 'before:today'],
            'nationality' => ['nullable', 'string', 'max:255'],
            'birth_place' => ['nullable', 'string', 'max:255'],
            'residency_status' => ['nullable', Rule::enum(ResidencyStatus::class)],
            'residency_number' => ['nullable', 'string', 'max:60'],
            'residency_expires_at' => ['nullable', 'date'],
            'employment_status' => ['nullable', Rule::enum(EmploymentStatus::class)],
            'employer' => ['nullable', 'string', 'max:255'],
            'income' => ['nullable', 'numeric', 'min:0', 'max:1000000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'birth_date' => 'date de naissance',
            'nationality' => 'nationalité',
            'birth_place' => 'lieu de naissance',
            'residency_status' => 'titre de séjour',
            'residency_number' => 'numéro du titre',
            'residency_expires_at' => 'validité du titre',
            'employment_status' => 'situation professionnelle',
            'employer' => 'employeur',
            'income' => 'revenu net mensuel',
        ];
    }
}

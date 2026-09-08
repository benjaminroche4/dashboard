<?php

declare(strict_types=1);

namespace App\Http\Requests\Staff;

use App\Actions\Staff\CreateStaffMember;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Ajout d'un membre depuis la page « Équipe » : mêmes règles que la commande
 * `staff:create`, plus la confirmation du mot de passe.
 */
class StoreStaffMemberRequest extends FormRequest
{
    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        $rules = CreateStaffMember::rules();
        $rules['password'][] = 'confirmed';

        return $rules;
    }
}

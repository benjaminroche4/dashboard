<?php

declare(strict_types=1);

namespace App\Actions\Staff;

use App\Data\StaffMemberData;
use App\Enums\StaffRole;
use App\Events\DashboardUpdated;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

/**
 * Action unique responsable de la création d'un membre du staff.
 * Utilisée par la commande staff:create et par la page « Équipe » des paramètres.
 */
final class CreateStaffMember
{
    /**
     * @return array<string, array<int, mixed>>
     */
    public static function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:'.User::class],
            'password' => ['required', 'string', Password::defaults()],
            'role' => ['required', Rule::enum(StaffRole::class)],
        ];
    }

    /**
     * @throws ValidationException
     */
    public function handle(StaffMemberData $data, ?User $by = null): User
    {
        Validator::make($data->toArray(), self::rules())->validate();

        $user = User::create([
            'name' => $data->name,
            'email' => $data->email,
            'password' => Hash::make($data->password),
            'role' => $data->role,
        ]);

        event(new DashboardUpdated('staff', ['id' => $user->id], "a ajouté {$user->name} à l'équipe", $by));

        return $user;
    }
}

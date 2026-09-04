<?php

namespace App\Actions\Staff;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

/**
 * Action unique responsable de la création d'un membre du staff.
 * Utilisée par la commande staff:create et réutilisable depuis un futur écran admin.
 */
class CreateStaffMember
{
    /**
     * @throws ValidationException
     */
    public function handle(string $name, string $email, string $password): User
    {
        $validated = Validator::make(
            ['name' => $name, 'email' => $email, 'password' => $password],
            [
                'name' => ['required', 'string', 'max:255'],
                'email' => ['required', 'string', 'email', 'max:255', 'unique:'.User::class],
                'password' => ['required', 'string', Password::defaults()],
            ],
        )->validate();

        return User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);
    }
}

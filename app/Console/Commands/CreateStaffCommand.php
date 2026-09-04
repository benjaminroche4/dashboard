<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Actions\Staff\CreateStaffMember;
use App\Data\StaffMemberData;
use App\Enums\StaffRole;
use Illuminate\Console\Command;
use Illuminate\Validation\ValidationException;

use function Laravel\Prompts\password;
use function Laravel\Prompts\select;
use function Laravel\Prompts\text;

/**
 * Le dashboard n'a pas d'inscription publique : les comptes staff
 * sont créés uniquement via cette commande (en local ou sur Laravel Cloud).
 */
final class CreateStaffCommand extends Command
{
    protected $signature = 'staff:create
        {--name= : Nom du membre}
        {--email= : Adresse email}
        {--password= : Mot de passe (sinon demandé de manière interactive)}
        {--role= : Rôle (admin, manager, member), member par défaut}';

    protected $description = 'Crée un compte membre du staff';

    public function handle(CreateStaffMember $createStaffMember): int
    {
        $name = $this->option('name') ?? text('Nom', required: true);
        $email = $this->option('email') ?? text('Email', required: true);
        $password = $this->option('password') ?? password('Mot de passe', required: true);
        $role = $this->option('role') ?? $this->askRole();

        if (StaffRole::tryFrom($role) === null) {
            $this->error('Rôle inconnu : '.$role.'. Valeurs possibles : '.implode(', ', StaffRole::values()));

            return self::FAILURE;
        }

        try {
            $user = $createStaffMember->handle(new StaffMemberData($name, $email, $password, StaffRole::from($role)));
        } catch (ValidationException $e) {
            foreach ($e->errors() as $messages) {
                foreach ($messages as $message) {
                    $this->error($message);
                }
            }

            return self::FAILURE;
        }

        $this->info("Membre du staff créé : {$user->name} <{$user->email}> ({$user->role->label()})");

        return self::SUCCESS;
    }

    /**
     * Demande le rôle en mode interactif, sinon "member" par défaut.
     */
    private function askRole(): string
    {
        if (! $this->input->isInteractive()) {
            return StaffRole::Member->value;
        }

        $labels = array_map(fn (StaffRole $role): string => $role->label(), StaffRole::cases());
        $choice = select('Rôle', array_combine(StaffRole::values(), $labels), StaffRole::Member->value);

        return is_string($choice) ? $choice : StaffRole::Member->value;
    }
}

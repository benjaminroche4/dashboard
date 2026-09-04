<?php

namespace App\Console\Commands;

use App\Actions\Staff\CreateStaffMember;
use Illuminate\Console\Command;
use Illuminate\Validation\ValidationException;

use function Laravel\Prompts\password;
use function Laravel\Prompts\text;

/**
 * Le dashboard n'a pas d'inscription publique : les comptes staff
 * sont créés uniquement via cette commande (en local ou sur Laravel Cloud).
 */
class CreateStaffCommand extends Command
{
    protected $signature = 'staff:create
        {--name= : Nom du membre}
        {--email= : Adresse email}
        {--password= : Mot de passe (sinon demandé de manière interactive)}';

    protected $description = 'Crée un compte membre du staff';

    public function handle(CreateStaffMember $createStaffMember): int
    {
        $name = $this->option('name') ?? text('Nom', required: true);
        $email = $this->option('email') ?? text('Email', required: true);
        $password = $this->option('password') ?? password('Mot de passe', required: true);

        try {
            $user = $createStaffMember->handle($name, $email, $password);
        } catch (ValidationException $e) {
            foreach ($e->errors() as $messages) {
                foreach ($messages as $message) {
                    $this->error($message);
                }
            }

            return self::FAILURE;
        }

        $this->info("Membre du staff créé : {$user->name} <{$user->email}>");

        return self::SUCCESS;
    }
}

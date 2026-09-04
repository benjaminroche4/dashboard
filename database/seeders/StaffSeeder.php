<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\StaffRole;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Comptes staff de développement. Mot de passe : "admin".
 * Réservé aux environnements local et testing : jamais exécuté en production.
 */
final class StaffSeeder extends Seeder
{
    /** @var list<array{name: string, email: string, role: StaffRole}> */
    public const array ACCOUNTS = [
        ['name' => 'Admin', 'email' => 'admin@admin.fr', 'role' => StaffRole::Admin],
        ['name' => 'Admin 2', 'email' => 'admin2@admin.fr', 'role' => StaffRole::Admin],
    ];

    public const string PASSWORD = 'admin';

    public function run(): void
    {
        foreach (self::ACCOUNTS as $account) {
            User::factory()
                ->staff(self::PASSWORD)
                ->create($account);
        }
    }
}

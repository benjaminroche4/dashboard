<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Compte staff de développement local uniquement.
     * En production, utiliser `php artisan staff:create`.
     */
    public function run(): void
    {
        if (! app()->environment('local')) {
            return;
        }

        User::factory()->create([
            'name' => 'Staff',
            'email' => 'staff@example.com',
        ]);
    }
}

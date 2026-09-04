<?php

declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

final class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Fixtures de développement. En production, créer les comptes
     * avec `php artisan staff:create`.
     */
    public function run(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            return;
        }

        $this->call([
            StaffSeeder::class,
            InvoiceSeeder::class,
            LeadSeeder::class,
        ]);
    }
}

<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Agency;
use App\Models\Agent;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Trois agences partenaires avec leurs agents, plus deux agents indépendants.
 */
final class RealEstateSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::query()->where('email', 'admin@admin.fr')->first();

        Agency::factory()->count(3)->create(['created_by' => $admin?->id])->each(function (Agency $agency) use ($admin): void {
            Agent::factory()->count(2)->forAgency($agency)->create(['created_by' => $admin?->id]);
        });

        Agent::factory()->count(2)->create(['created_by' => $admin?->id]);
    }
}

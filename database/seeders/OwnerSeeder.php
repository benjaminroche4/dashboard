<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\OwnerStatus;
use App\Models\Owner;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Propriétaires à prospecter pour le développement : 14 fiches à divers stades.
 */
final class OwnerSeeder extends Seeder
{
    public function run(): void
    {
        $creator = fn (): array => ['created_by' => User::query()->inRandomOrder()->value('id')];

        Owner::factory()->count(6)->state($creator)->create();
        Owner::factory()->count(3)->status(OwnerStatus::Contacted)->state($creator)->create();
        Owner::factory()->count(2)->status(OwnerStatus::Interested)->state($creator)->create();
        Owner::factory()->count(2)->status(OwnerStatus::Mandate)->state($creator)->create();
        Owner::factory()->status(OwnerStatus::Declined)->state($creator)->create();
    }
}

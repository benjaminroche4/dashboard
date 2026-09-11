<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Owner;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Annuaire des propriétaires pour le développement : 14 fiches, dont
 * quelques sociétés. La moitié porte un dernier échange, pour que la colonne
 * « Dernier échange » et le tri des oubliés aient de quoi montrer.
 */
final class OwnerSeeder extends Seeder
{
    public function run(): void
    {
        $creator = fn (): array => ['created_by' => User::query()->inRandomOrder()->value('id')];

        Owner::factory()->count(10)->state($creator)->create();
        Owner::factory()->count(4)->company()->state($creator)->create();

        Owner::query()->inRandomOrder()->limit(7)->get()
            ->each(fn (Owner $owner) => $owner->forceFill(['last_contacted_at' => now()->subDays(random_int(1, 120))])->save());
    }
}

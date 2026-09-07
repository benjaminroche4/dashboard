<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\PartnerType;
use App\Models\Partner;
use App\Models\PartnerContact;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Un partenaire par type avec deux interlocuteurs, plus deux de gestion.
 */
final class PartnerSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::query()->where('email', 'admin@admin.fr')->first();

        foreach (PartnerType::cases() as $type) {
            $partner = Partner::factory()->type($type)->create(['created_by' => $admin?->id]);
            PartnerContact::factory()->count(2)->for($partner)->create();
        }

        Partner::factory()->count(2)->type(PartnerType::Management)->create(['created_by' => $admin?->id]);
    }
}

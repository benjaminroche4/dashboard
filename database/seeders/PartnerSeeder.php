<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\PartnerType;
use App\Models\Invoice;
use App\Models\Partner;
use App\Models\PartnerContact;
use App\Models\Quote;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Un partenaire par type avec deux interlocuteurs, plus deux de gestion. Le
 * premier porte un devis et une facture, pour que l'historique commercial de
 * sa fiche ait de quoi montrer.
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

        $first = Partner::query()->oldest('id')->first();

        if ($first instanceof Partner) {
            Quote::factory()->create(['partner_id' => $first->id, 'client_name' => $first->name, 'created_by' => $admin?->id]);
            Invoice::factory()->create(['partner_id' => $first->id, 'client_name' => $first->name, 'created_by' => $admin?->id]);
        }
    }
}

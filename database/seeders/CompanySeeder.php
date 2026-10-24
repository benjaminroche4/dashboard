<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\LeadStatus;
use App\Models\Company;
use App\Models\CompanyContact;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Quatre entreprises avec leurs contacts (la première en a deux principaux),
 * et quelques dossiers clients rattachés pour que la fiche ait de quoi montrer.
 */
final class CompanySeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::query()->where('email', 'admin@admin.fr')->first();
        $clients = Lead::query()->where('status', LeadStatus::Converted)->whereNull('company_id')->orderBy('id')->limit(5)->get();

        foreach (range(1, 4) as $index) {
            $company = Company::factory()->create(['created_by' => $admin?->id]);

            CompanyContact::factory()->primary()->for($company)->create();
            CompanyContact::factory()->for($company)->count($index === 1 ? 1 : 2)->create();

            if ($index === 1) {
                CompanyContact::factory()->primary()->for($company)->create();
            }

            foreach ($clients->splice(0, $index === 1 ? 2 : 1) as $client) {
                $client->forceFill(['company_id' => $company->id, 'company' => $client->company ?? $company->name])->save();
            }
        }
    }
}

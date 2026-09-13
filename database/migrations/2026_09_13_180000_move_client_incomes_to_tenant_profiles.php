<?php

declare(strict_types=1);

use App\Enums\TenantSlot;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Le revenu d'un locataire vivait à deux endroits : sur le dossier
 * (`leads.income_cents` / `co_income_cents`, dialogue « Personnes du dossier »)
 * et dans sa fiche (`leads.tenant_profiles.<slot>.income_cents`, avec son statut
 * professionnel et son employeur). On ne garde que la fiche : le revenu se lit
 * là où on lit d'où il vient. Les valeurs déjà saisies y sont reportées.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('leads', 'income_cents')) {
            return;
        }

        foreach (DB::table('leads')->select('id', 'income_cents', 'co_income_cents', 'tenant_profiles')->cursor() as $lead) {
            $profiles = json_decode((string) ($lead->tenant_profiles ?? '{}'), true);
            $profiles = is_array($profiles) ? $profiles : [];
            $touched = false;

            foreach ([TenantSlot::Primary->value => 'income_cents', TenantSlot::Co->value => 'co_income_cents'] as $slot => $column) {
                $income = $lead->{$column};

                // La fiche prime : elle n'est écrasée que si elle ne dit rien.
                if ($income === null || ($profiles[$slot]['income_cents'] ?? null) !== null) {
                    continue;
                }

                $profiles[$slot] = [...$profiles[$slot] ?? [], 'income_cents' => (int) $income];
                $touched = true;
            }

            if ($touched) {
                DB::table('leads')->where('id', $lead->id)->update(['tenant_profiles' => json_encode($profiles)]);
            }
        }

        Schema::table('leads', fn (Blueprint $table) => $table->dropColumn(['income_cents', 'co_income_cents']));
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table): void {
            $table->unsignedBigInteger('income_cents')->nullable();
            $table->unsignedBigInteger('co_income_cents')->nullable();
        });
    }
};

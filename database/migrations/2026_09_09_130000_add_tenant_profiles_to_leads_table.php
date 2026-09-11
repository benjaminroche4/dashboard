<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Détails d'un locataire du dossier (état civil, titre de séjour, situation
 * professionnelle), par emplacement : « primary » et « co ». Les garants et
 * les membres du suivi n'en ont pas.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('leads', 'tenant_profiles')) {
            return;
        }

        Schema::table('leads', function (Blueprint $table): void {
            $table->json('tenant_profiles')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table): void {
            $table->dropColumn('tenant_profiles');
        });
    }
};

<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Pays de la ville d'origine (code ISO à deux lettres), résolu par Google
 * Places quand la ville est choisie dans la liste : la fiche affiche le
 * drapeau à côté de la ville.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table): void {
            if (! Schema::hasColumn('leads', 'origin_country')) {
                $table->string('origin_country', 2)->nullable()->after('origin_city');
            }
        });
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table): void {
            if (Schema::hasColumn('leads', 'origin_country')) {
                $table->dropColumn('origin_country');
            }
        });
    }
};

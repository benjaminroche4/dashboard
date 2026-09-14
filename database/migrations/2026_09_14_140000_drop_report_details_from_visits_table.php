<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Le compte rendu d'une visite redevient du texte libre : le formulaire guidé
 * (ressenti, notes par critère, points forts…) a été retiré, sa colonne suit.
 * Migration rejouable, comme toutes celles du projet.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('visits', function (Blueprint $table): void {
            if (Schema::hasColumn('visits', 'report_details')) {
                $table->dropColumn('report_details');
            }
        });
    }

    public function down(): void
    {
        Schema::table('visits', function (Blueprint $table): void {
            if (! Schema::hasColumn('visits', 'report_details')) {
                $table->json('report_details')->nullable()->after('report');
            }
        });
    }
};

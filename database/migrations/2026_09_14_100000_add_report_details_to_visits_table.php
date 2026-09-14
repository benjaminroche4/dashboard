<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Compte rendu de visite structuré : ressenti général, notes par critère,
 * points forts, réserves, réaction du client et suite à donner. Le texte libre
 * (`report`) reste les impressions générales ; le détail vit en JSON à côté.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('visits', 'report_details')) {
            return;
        }

        Schema::table('visits', fn (Blueprint $table) => $table->json('report_details')->nullable()->after('report'));
    }

    public function down(): void
    {
        Schema::table('visits', fn (Blueprint $table) => $table->dropColumn('report_details'));
    }
};

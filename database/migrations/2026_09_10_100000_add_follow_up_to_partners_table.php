<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Suivi d'un partenaire : date du dernier échange et qualité de la relation,
 * comme pour les agents immobiliers.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('partners', function (Blueprint $table): void {
            if (! Schema::hasColumn('partners', 'last_contacted_at')) {
                $table->timestamp('last_contacted_at')->nullable()->after('notes');
            }

            if (! Schema::hasColumn('partners', 'relationship_quality')) {
                $table->string('relationship_quality', 20)->nullable()->after('type');
            }
        });
    }

    public function down(): void
    {
        Schema::table('partners', function (Blueprint $table): void {
            if (Schema::hasColumn('partners', 'last_contacted_at')) {
                $table->dropColumn('last_contacted_at');
            }

            if (Schema::hasColumn('partners', 'relationship_quality')) {
                $table->dropColumn('relationship_quality');
            }
        });
    }
};

<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Situation professionnelle du lead (CDI, indépendant, étudiant…), saisie en
 * place sur la fiche : une agence juge un dossier là-dessus avant le budget.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table): void {
            if (! Schema::hasColumn('leads', 'employment_status')) {
                $table->string('employment_status', 30)->nullable()->after('origin_country');
            }
        });
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table): void {
            if (Schema::hasColumn('leads', 'employment_status')) {
                $table->dropColumn('employment_status');
            }
        });
    }
};

<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Revenu mensuel net de chaque locataire du dossier : il sert à vérifier que
 * le loyer visé tient dans les revenus du foyer.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table): void {
            if (! Schema::hasColumn('leads', 'income_cents')) {
                $table->unsignedBigInteger('income_cents')->nullable()->after('budget_cents');
                $table->unsignedBigInteger('co_income_cents')->nullable()->after('income_cents');
            }
        });
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table): void {
            if (Schema::hasColumn('leads', 'income_cents')) {
                $table->dropColumn(['income_cents', 'co_income_cents']);
            }
        });
    }
};

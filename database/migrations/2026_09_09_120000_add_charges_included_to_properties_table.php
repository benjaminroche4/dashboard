<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('properties', 'charges_included')) {
            return;
        }

        Schema::table('properties', function (Blueprint $table): void {
            // Le loyer est hors charges par défaut ; certaines annonces l'affichent charges comprises.
            $table->boolean('charges_included')->default(false)->after('charges_cents');
        });
    }

    public function down(): void
    {
        Schema::table('properties', function (Blueprint $table): void {
            $table->dropColumn('charges_included');
        });
    }
};

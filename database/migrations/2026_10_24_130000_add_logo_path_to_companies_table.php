<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Logo d'une entreprise de l'annuaire : un fichier sur le disque `public`
 * (dossier `company-logos/`), servi par lien signé dans un bucket.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('companies', 'logo_path')) {
            return;
        }

        Schema::table('companies', function (Blueprint $table): void {
            $table->string('logo_path')->nullable()->after('notes');
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('companies', 'logo_path')) {
            return;
        }

        Schema::table('companies', function (Blueprint $table): void {
            $table->dropColumn('logo_path');
        });
    }
};

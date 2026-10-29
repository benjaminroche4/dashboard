<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Logo d'un partenaire de l'annuaire : un fichier sur le disque `public`
 * (dossier `partner-logos/`), servi par lien signé dans un bucket. Rejouable.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('partners', 'logo_path')) {
            return;
        }

        Schema::table('partners', function (Blueprint $table): void {
            $table->string('logo_path')->nullable()->after('notes');
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('partners', 'logo_path')) {
            return;
        }

        Schema::table('partners', function (Blueprint $table): void {
            $table->dropColumn('logo_path');
        });
    }
};

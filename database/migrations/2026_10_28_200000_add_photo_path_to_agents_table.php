<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Photo d'un agent immobilier de l'annuaire : un fichier sur le disque
 * `public` (dossier `agent-photos/`), servi par lien signé dans un bucket.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('agents', 'photo_path')) {
            return;
        }

        Schema::table('agents', function (Blueprint $table): void {
            $table->string('photo_path')->nullable()->after('notes');
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('agents', 'photo_path')) {
            return;
        }

        Schema::table('agents', function (Blueprint $table): void {
            $table->dropColumn('photo_path');
        });
    }
};

<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Agence d'un bien : un logement se rattache souvent à une agence avant qu'on
 * en connaisse l'agent (2 novembre 2026, action rapide « Contacts » de la
 * fiche). Rejouable ; la clé étrangère tombe avant sa colonne (MySQL).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('properties', 'agency_id')) {
            return;
        }

        Schema::table('properties', function (Blueprint $table): void {
            $table->foreignId('agency_id')->nullable()->after('agent_id')->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('properties', 'agency_id')) {
            return;
        }

        Schema::table('properties', function (Blueprint $table): void {
            $table->dropForeign(['agency_id']);
            $table->dropColumn('agency_id');
        });
    }
};

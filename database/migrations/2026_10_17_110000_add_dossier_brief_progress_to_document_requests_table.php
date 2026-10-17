<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Avancement de la synthèse en cours (partie par partie), lu par la page pour
 * suivre le travail de l'assistant ; effacé quand la synthèse est écrite.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('document_requests', function (Blueprint $table): void {
            if (! Schema::hasColumn('document_requests', 'dossier_brief_progress')) {
                $table->json('dossier_brief_progress')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('document_requests', function (Blueprint $table): void {
            if (Schema::hasColumn('document_requests', 'dossier_brief_progress')) {
                $table->dropColumn('dossier_brief_progress');
            }
        });
    }
};

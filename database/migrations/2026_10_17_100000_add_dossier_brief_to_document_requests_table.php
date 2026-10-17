<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Synthèse du dossier fusionné rédigée par l'assistant : page de garde et
 * fiches récapitulatives par partie, avec l'empreinte des pièces lues.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('document_requests', function (Blueprint $table): void {
            if (! Schema::hasColumn('document_requests', 'dossier_brief')) {
                $table->json('dossier_brief')->nullable();
            }

            if (! Schema::hasColumn('document_requests', 'dossier_brief_at')) {
                $table->timestamp('dossier_brief_at')->nullable();
            }

            if (! Schema::hasColumn('document_requests', 'dossier_brief_fingerprint')) {
                $table->string('dossier_brief_fingerprint', 64)->nullable();
            }

            if (! Schema::hasColumn('document_requests', 'dossier_brief_requested_at')) {
                $table->timestamp('dossier_brief_requested_at')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('document_requests', function (Blueprint $table): void {
            foreach (['dossier_brief', 'dossier_brief_at', 'dossier_brief_fingerprint', 'dossier_brief_requested_at'] as $column) {
                if (Schema::hasColumn('document_requests', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};

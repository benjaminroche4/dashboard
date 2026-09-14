<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Profil de matching d'une agence (quartiers couverts, spécialités, langues,
 * frais, gamme de loyers, dossiers acceptés, mandats) et, plus court, d'un
 * agent (quartiers, spécialités, langues). Jamais demandé à la création :
 * tout est nullable, renseigné après coup sur la fiche ou proposé par l'IA.
 * Rejouable : chaque colonne n'est ajoutée que si elle manque.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agencies', function (Blueprint $table): void {
            foreach (['districts', 'specialties', 'languages', 'mandate_types', 'ai_profile'] as $json) {
                if (! Schema::hasColumn('agencies', $json)) {
                    $table->json($json)->nullable();
                }
            }
            if (! Schema::hasColumn('agencies', 'fee_note')) {
                $table->string('fee_note', 255)->nullable();
            }
            if (! Schema::hasColumn('agencies', 'rent_min_cents')) {
                $table->unsignedInteger('rent_min_cents')->nullable();
            }
            if (! Schema::hasColumn('agencies', 'rent_max_cents')) {
                $table->unsignedInteger('rent_max_cents')->nullable();
            }
            if (! Schema::hasColumn('agencies', 'accepts_garantme')) {
                $table->boolean('accepts_garantme')->nullable();
            }
            if (! Schema::hasColumn('agencies', 'accepts_foreign_files')) {
                $table->boolean('accepts_foreign_files')->nullable();
            }
            if (! Schema::hasColumn('agencies', 'ai_profile_at')) {
                $table->timestamp('ai_profile_at')->nullable();
            }
            if (! Schema::hasColumn('agencies', 'google_place_id')) {
                $table->string('google_place_id', 255)->nullable()->unique();
            }
        });

        Schema::table('agents', function (Blueprint $table): void {
            foreach (['districts', 'specialties', 'languages'] as $json) {
                if (! Schema::hasColumn('agents', $json)) {
                    $table->json($json)->nullable();
                }
            }
        });
    }

    public function down(): void
    {
        Schema::table('agencies', function (Blueprint $table): void {
            foreach (['districts', 'specialties', 'languages', 'mandate_types', 'ai_profile', 'fee_note', 'rent_min_cents', 'rent_max_cents', 'accepts_garantme', 'accepts_foreign_files', 'ai_profile_at', 'google_place_id'] as $column) {
                if (Schema::hasColumn('agencies', $column)) {
                    $table->dropColumn($column);
                }
            }
        });

        Schema::table('agents', function (Blueprint $table): void {
            foreach (['districts', 'specialties', 'languages'] as $column) {
                if (Schema::hasColumn('agents', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};

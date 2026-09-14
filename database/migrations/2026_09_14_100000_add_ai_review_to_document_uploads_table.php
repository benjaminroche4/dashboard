<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Lecture d'une pièce par l'assistant IA : sa proposition (nature du document,
 * verdict, motif, informations lues) attend la relecture d'un membre. Rien
 * n'est décidé ici : `status` reste la seule décision qui compte.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('document_uploads', function (Blueprint $table): void {
            if (! Schema::hasColumn('document_uploads', 'ai_review')) {
                $table->json('ai_review')->nullable();
            }

            if (! Schema::hasColumn('document_uploads', 'ai_reviewed_at')) {
                $table->timestamp('ai_reviewed_at')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('document_uploads', function (Blueprint $table): void {
            $table->dropColumn(array_values(array_filter(
                ['ai_review', 'ai_reviewed_at'],
                fn (string $column): bool => Schema::hasColumn('document_uploads', $column),
            )));
        });
    }
};

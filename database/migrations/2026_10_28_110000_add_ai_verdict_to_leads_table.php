<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * L'avis de l'assistant sur un lead (« AI check », décision du 28 octobre
 * 2026) : qualifié ou non, son motif et sa date, conservés à part de la
 * proposition de champs, qui s'efface à la relecture. Rejouable.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('leads', 'ai_verdict')) {
            return;
        }

        Schema::table('leads', function (Blueprint $table): void {
            $table->string('ai_verdict', 20)->nullable()->after('ai_qualified_at');
            $table->string('ai_verdict_reason', 300)->nullable()->after('ai_verdict');
            $table->timestamp('ai_verdict_at')->nullable()->after('ai_verdict_reason');
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('leads', 'ai_verdict')) {
            return;
        }

        Schema::table('leads', function (Blueprint $table): void {
            $table->dropColumn(['ai_verdict', 'ai_verdict_reason', 'ai_verdict_at']);
        });
    }
};

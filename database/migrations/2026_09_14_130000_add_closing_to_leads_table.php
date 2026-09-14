<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Clôture d'un dossier client : la date, le motif et une précision. Un dossier
 * clôturé passe en « Archivé » sur le kanban ; `closed_at` dit qu'il fut un
 * client, ce qu'un lead archivé sans suite n'a jamais été.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table): void {
            if (! Schema::hasColumn('leads', 'closed_at')) {
                $table->timestamp('closed_at')->nullable();
            }

            if (! Schema::hasColumn('leads', 'closing_reason')) {
                $table->string('closing_reason', 30)->nullable();
            }

            if (! Schema::hasColumn('leads', 'closing_note')) {
                $table->text('closing_note')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table): void {
            $table->dropColumn(array_values(array_filter(
                ['closed_at', 'closing_reason', 'closing_note'],
                fn (string $column): bool => Schema::hasColumn('leads', $column),
            )));
        });
    }
};

<?php

declare(strict_types=1);

use App\Enums\DocumentUploadStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Vérification d'une pièce déposée : statut, motif de refus et auteur de la
 * décision. Migration rejouable (un déploiement interrompu se reprend).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('document_uploads', function (Blueprint $table): void {
            if (! Schema::hasColumn('document_uploads', 'status')) {
                $table->string('status', 20)->default(DocumentUploadStatus::Pending->value)->index();
            }

            if (! Schema::hasColumn('document_uploads', 'review_note')) {
                $table->text('review_note')->nullable();
            }

            if (! Schema::hasColumn('document_uploads', 'reviewed_at')) {
                $table->timestamp('reviewed_at')->nullable();
            }

            if (! Schema::hasColumn('document_uploads', 'reviewed_by')) {
                $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('document_uploads', function (Blueprint $table): void {
            if (Schema::hasColumn('document_uploads', 'reviewed_by')) {
                $table->dropConstrainedForeignId('reviewed_by');
            }

            $table->dropColumn(array_values(array_filter(
                ['status', 'review_note', 'reviewed_at'],
                fn (string $column): bool => Schema::hasColumn('document_uploads', $column),
            )));
        });
    }
};

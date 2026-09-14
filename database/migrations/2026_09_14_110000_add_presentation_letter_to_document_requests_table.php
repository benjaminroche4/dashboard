<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Lettre de présentation du foyer, imprimée en tête du dossier fusionné. */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('document_requests', 'presentation_letter')) {
            Schema::table('document_requests', function (Blueprint $table): void {
                $table->text('presentation_letter')->nullable();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('document_requests', 'presentation_letter')) {
            Schema::table('document_requests', function (Blueprint $table): void {
                $table->dropColumn('presentation_letter');
            });
        }
    }
};

<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Identifiant public des listes de documents : les URL (fiche, PDF, modification) portent un UUID au lieu de l'identifiant numérique.
     */
    public function up(): void
    {
        Schema::table('document_requests', function (Blueprint $table): void {
            $table->uuid('uuid')->nullable()->after('id');
        });

        DB::table('document_requests')->whereNull('uuid')->orderBy('id')->each(function (object $documentRequest): void {
            DB::table('document_requests')->where('id', $documentRequest->id)->update(['uuid' => (string) Str::orderedUuid()]);
        });

        Schema::table('document_requests', function (Blueprint $table): void {
            $table->uuid('uuid')->nullable(false)->unique()->change();
        });
    }

    public function down(): void
    {
        Schema::table('document_requests', function (Blueprint $table): void {
            $table->dropUnique(['uuid']);
            $table->dropColumn('uuid');
        });
    }
};

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
     * Identifiant public des pièces du catalogue : les URL de modification et de suppression portent un UUID au lieu de l'identifiant numérique. Les pièces insérées par la migration de création reçoivent le leur ici.
     */
    public function up(): void
    {
        Schema::table('catalog_documents', function (Blueprint $table): void {
            $table->uuid('uuid')->nullable()->after('id');
        });

        DB::table('catalog_documents')->whereNull('uuid')->orderBy('id')->each(function (object $document): void {
            DB::table('catalog_documents')->where('id', $document->id)->update(['uuid' => (string) Str::orderedUuid()]);
        });

        Schema::table('catalog_documents', function (Blueprint $table): void {
            $table->uuid('uuid')->nullable(false)->unique()->change();
        });
    }

    public function down(): void
    {
        Schema::table('catalog_documents', function (Blueprint $table): void {
            $table->dropUnique(['uuid']);
            $table->dropColumn('uuid');
        });
    }
};

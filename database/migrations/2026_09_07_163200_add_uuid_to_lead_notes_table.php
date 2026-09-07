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
     * Identifiant public des notes de lead : les routes de modification et de suppression portent un UUID au lieu de l'identifiant numérique.
     */
    public function up(): void
    {
        Schema::table('lead_notes', function (Blueprint $table): void {
            $table->uuid('uuid')->nullable()->after('id');
        });

        DB::table('lead_notes')->whereNull('uuid')->orderBy('id')->each(function (object $note): void {
            DB::table('lead_notes')->where('id', $note->id)->update(['uuid' => (string) Str::orderedUuid()]);
        });

        Schema::table('lead_notes', function (Blueprint $table): void {
            $table->uuid('uuid')->nullable(false)->unique()->change();
        });
    }

    public function down(): void
    {
        Schema::table('lead_notes', function (Blueprint $table): void {
            $table->dropUnique(['uuid']);
            $table->dropColumn('uuid');
        });
    }
};

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
     * Identifiant public des devis : l'URL du devis porte un UUID au lieu de l'identifiant numérique.
     */
    public function up(): void
    {
        Schema::table('quotes', function (Blueprint $table): void {
            $table->uuid('uuid')->nullable()->after('id');
        });

        DB::table('quotes')->whereNull('uuid')->orderBy('id')->each(function (object $quote): void {
            DB::table('quotes')->where('id', $quote->id)->update(['uuid' => (string) Str::orderedUuid()]);
        });

        Schema::table('quotes', function (Blueprint $table): void {
            $table->uuid('uuid')->nullable(false)->unique()->change();
        });
    }

    public function down(): void
    {
        Schema::table('quotes', function (Blueprint $table): void {
            $table->dropUnique(['uuid']);
            $table->dropColumn('uuid');
        });
    }
};

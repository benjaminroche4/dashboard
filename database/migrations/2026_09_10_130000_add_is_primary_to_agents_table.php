<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Agent principal d'une agence : celui que l'équipe appelle en premier, comme
 * l'interlocuteur principal d'un partenaire.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('agents', 'is_primary')) {
            return;
        }

        Schema::table('agents', fn (Blueprint $table) => $table->boolean('is_primary')->default(false));
    }

    public function down(): void
    {
        Schema::table('agents', fn (Blueprint $table) => $table->dropColumn('is_primary'));
    }
};

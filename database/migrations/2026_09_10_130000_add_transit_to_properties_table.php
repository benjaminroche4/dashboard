<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Transports proches d'un bien (métro, RER, tram, bus), proposés par
 * l'assistant IA puis relus par l'équipe.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('properties', function (Blueprint $table): void {
            if (! Schema::hasColumn('properties', 'transit')) {
                $table->json('transit')->nullable()->after('district');
            }
        });
    }

    public function down(): void
    {
        Schema::table('properties', function (Blueprint $table): void {
            if (Schema::hasColumn('properties', 'transit')) {
                $table->dropColumn('transit');
            }
        });
    }
};

<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Notes libres de l'équipe sur le projet de relocation, distinctes de
 * `message` (ce que le lead a dit en arrivant, du site ou au téléphone).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table): void {
            if (! Schema::hasColumn('leads', 'project_notes')) {
                $table->text('project_notes')->nullable()->after('message');
            }
        });
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table): void {
            if (Schema::hasColumn('leads', 'project_notes')) {
                $table->dropColumn('project_notes');
            }
        });
    }
};

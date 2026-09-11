<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Qualité de la relation avec un agent, notée par l'équipe. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agents', function (Blueprint $table): void {
            if (! Schema::hasColumn('agents', 'relationship_quality')) {
                $table->string('relationship_quality', 20)->nullable()->after('position');
            }
        });
    }

    public function down(): void
    {
        Schema::table('agents', function (Blueprint $table): void {
            if (Schema::hasColumn('agents', 'relationship_quality')) {
                $table->dropColumn('relationship_quality');
            }
        });
    }
};

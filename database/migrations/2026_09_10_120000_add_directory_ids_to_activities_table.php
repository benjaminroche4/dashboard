<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Journal d'activité rattaché à une agence ou à un agent, comme il l'est déjà
 * à un lead et à un partenaire : leurs fiches affichent leurs dernières actions.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('activities', function (Blueprint $table): void {
            if (! Schema::hasColumn('activities', 'agency_id')) {
                $table->foreignId('agency_id')->nullable()->constrained()->nullOnDelete();
                $table->index(['agency_id', 'created_at']);
            }

            if (! Schema::hasColumn('activities', 'agent_id')) {
                $table->foreignId('agent_id')->nullable()->constrained()->nullOnDelete();
                $table->index(['agent_id', 'created_at']);
            }
        });
    }

    public function down(): void
    {
        Schema::table('activities', function (Blueprint $table): void {
            foreach (['agency_id', 'agent_id'] as $column) {
                if (Schema::hasColumn('activities', $column)) {
                    $table->dropIndex([$column, 'created_at']);
                    $table->dropConstrainedForeignId($column);
                }
            }
        });
    }
};

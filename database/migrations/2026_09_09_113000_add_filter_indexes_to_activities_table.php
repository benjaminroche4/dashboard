<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Le journal grossit sans fin (plusieurs centaines d'actions par jour) et
 * chaque page le trie par date : un index composite par filtre évite le
 * balayage complet sur Postgres, qui n'indexe pas les clés étrangères.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('activities', function (Blueprint $table): void {
            $table->index(['user_id', 'created_at'], 'activities_user_created_index');
            $table->index(['lead_id', 'created_at'], 'activities_lead_created_index');
            $table->index(['resource', 'created_at'], 'activities_resource_created_index');
        });
    }

    public function down(): void
    {
        Schema::table('activities', function (Blueprint $table): void {
            $table->dropIndex('activities_user_created_index');
            $table->dropIndex('activities_lead_created_index');
            $table->dropIndex('activities_resource_created_index');
        });
    }
};

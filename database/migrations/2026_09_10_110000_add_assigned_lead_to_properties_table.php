<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Bien attribué à un client : il est pris, donc plus proposé en visite.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('properties', function (Blueprint $table): void {
            if (! Schema::hasColumn('properties', 'assigned_lead_id')) {
                $table->foreignId('assigned_lead_id')->nullable()->after('owner_id')->constrained('leads')->nullOnDelete();
                $table->timestamp('assigned_at')->nullable()->after('assigned_lead_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('properties', function (Blueprint $table): void {
            if (Schema::hasColumn('properties', 'assigned_lead_id')) {
                $table->dropConstrainedForeignId('assigned_lead_id');
                $table->dropColumn('assigned_at');
            }
        });
    }
};

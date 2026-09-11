<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Partenaire rattaché à un bien (gestion, assurance, déménagement…), à côté
 * de son agent et de son propriétaire.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('properties', function (Blueprint $table): void {
            if (! Schema::hasColumn('properties', 'partner_id')) {
                $table->foreignId('partner_id')->nullable()->after('owner_id')->constrained('partners')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('properties', function (Blueprint $table): void {
            if (Schema::hasColumn('properties', 'partner_id')) {
                $table->dropConstrainedForeignId('partner_id');
            }
        });
    }
};

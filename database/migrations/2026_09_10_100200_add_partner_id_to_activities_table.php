<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Journal d'activité rattaché à un partenaire, comme il l'est déjà à un lead. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('activities', function (Blueprint $table): void {
            if (! Schema::hasColumn('activities', 'partner_id')) {
                $table->foreignId('partner_id')->nullable()->after('lead_id')->constrained()->nullOnDelete();
                $table->index(['partner_id', 'created_at']);
            }
        });
    }

    public function down(): void
    {
        Schema::table('activities', function (Blueprint $table): void {
            if (Schema::hasColumn('activities', 'partner_id')) {
                $table->dropIndex(['partner_id', 'created_at']);
                $table->dropConstrainedForeignId('partner_id');
            }
        });
    }
};

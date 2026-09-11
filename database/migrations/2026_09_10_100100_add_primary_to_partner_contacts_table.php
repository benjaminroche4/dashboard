<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Interlocuteur principal d'un partenaire : celui que l'on joint d'abord. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('partner_contacts', function (Blueprint $table): void {
            if (! Schema::hasColumn('partner_contacts', 'is_primary')) {
                $table->boolean('is_primary')->default(false)->after('position');
            }
        });
    }

    public function down(): void
    {
        Schema::table('partner_contacts', function (Blueprint $table): void {
            if (Schema::hasColumn('partner_contacts', 'is_primary')) {
                $table->dropColumn('is_primary');
            }
        });
    }
};

<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * L'annuaire des propriétaires garde deux traces que la prospection lui
 * laissait : le lead d'où il vient (gestion locative signée) et la date du
 * dernier échange, pour repérer ceux qu'on n'a pas rappelés.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('owners', function (Blueprint $table): void {
            if (! Schema::hasColumn('owners', 'lead_id')) {
                $table->foreignId('lead_id')->nullable()->constrained()->nullOnDelete();
            }

            if (! Schema::hasColumn('owners', 'last_contacted_at')) {
                $table->timestamp('last_contacted_at')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('owners', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('lead_id');
            $table->dropColumn('last_contacted_at');
        });
    }
};

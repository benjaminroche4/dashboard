<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Un dossier peut concerner deux locataires et être suivi par deux membres :
 * second contact du foyer et second responsable, tous deux facultatifs.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table): void {
            if (! Schema::hasColumn('leads', 'co_first_name')) {
                $table->string('co_first_name')->nullable()->after('phone');
                $table->string('co_last_name')->nullable()->after('co_first_name');
                $table->string('co_email')->nullable()->after('co_last_name');
                $table->string('co_phone', 40)->nullable()->after('co_email');
            }

            if (! Schema::hasColumn('leads', 'co_assigned_to')) {
                $table->foreignId('co_assigned_to')->nullable()->after('assigned_to')->constrained('users')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table): void {
            if (Schema::hasColumn('leads', 'co_assigned_to')) {
                $table->dropConstrainedForeignId('co_assigned_to');
            }

            if (Schema::hasColumn('leads', 'co_first_name')) {
                $table->dropColumn(['co_first_name', 'co_last_name', 'co_email', 'co_phone']);
            }
        });
    }
};

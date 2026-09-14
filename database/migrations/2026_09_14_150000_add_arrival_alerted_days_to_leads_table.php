<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Paliers d'alerte déjà envoyés avant l'installation d'un client (J-15, J-7,
 * J-3) : sans cette trace, la commande quotidienne renverrait le même e-mail
 * tous les jours. Migration rejouable.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table): void {
            if (! Schema::hasColumn('leads', 'arrival_alerted_days')) {
                $table->json('arrival_alerted_days')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table): void {
            if (Schema::hasColumn('leads', 'arrival_alerted_days')) {
                $table->dropColumn('arrival_alerted_days');
            }
        });
    }
};

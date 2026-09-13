<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Téléphone d'une personne de suivi : on lui écrit, mais on l'appelle aussi
 * (un parent qui se porte caution, un contact RH qui débloque un dossier).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('lead_watchers', 'phone')) {
            return;
        }

        Schema::table('lead_watchers', function (Blueprint $table): void {
            $table->string('phone', 40)->nullable()->after('email');
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('lead_watchers', 'phone')) {
            return;
        }

        Schema::table('lead_watchers', function (Blueprint $table): void {
            $table->dropColumn('phone');
        });
    }
};

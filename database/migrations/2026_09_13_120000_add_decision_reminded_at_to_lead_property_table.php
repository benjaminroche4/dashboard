<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Relance « le client n'a pas tranché » : date du dernier rappel envoyé aux
 * personnes de suivi pour ce bien. Remise à null dès que le statut change,
 * pour qu'un bien qui repasse « À décider » soit relancé de nouveau.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('lead_property', 'decision_reminded_at')) {
            return;
        }

        Schema::table('lead_property', fn (Blueprint $table) => $table->timestamp('decision_reminded_at')->nullable());
    }

    public function down(): void
    {
        Schema::table('lead_property', fn (Blueprint $table) => $table->dropColumn('decision_reminded_at'));
    }
};

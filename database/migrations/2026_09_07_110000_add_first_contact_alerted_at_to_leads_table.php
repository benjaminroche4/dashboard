<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Date d'envoi de l'alerte « 30 minutes sans premier contact » : une seule alerte par lead.
     */
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table): void {
            $table->timestamp('first_contact_alerted_at')->nullable()->after('last_contacted_at');
        });
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table): void {
            $table->dropColumn('first_contact_alerted_at');
        });
    }
};

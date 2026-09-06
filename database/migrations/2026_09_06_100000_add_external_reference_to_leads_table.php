<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table): void {
            // Référence du formulaire du site (CT-XXXXXX) : un même envoi ne crée jamais deux leads.
            $table->string('external_reference', 20)->nullable()->unique()->after('reference');
        });
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table): void {
            $table->dropUnique(['external_reference']);
            $table->dropColumn('external_reference');
        });
    }
};

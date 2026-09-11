<?php

declare(strict_types=1);

use App\Enums\VisitMode;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Mode d'une visite : l'équipe visite pour le client, ou le client visite
 * seul (formule « Accompagné » uniquement).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('visits', 'mode')) {
            return;
        }

        Schema::table('visits', function (Blueprint $table): void {
            $table->string('mode', 20)->default(VisitMode::ForClient->value)->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('visits', function (Blueprint $table): void {
            $table->dropColumn('mode');
        });
    }
};

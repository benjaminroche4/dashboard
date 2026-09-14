<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Événement Google Calendar posé dans l'agenda du membre qui réalise la
 * visite : son identifiant, et l'agenda (adresse) qui le porte — sans elle on
 * ne saurait plus le retirer quand la visite change de membre.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('visits', function (Blueprint $table): void {
            if (! Schema::hasColumn('visits', 'calendar_event_id')) {
                $table->string('calendar_event_id')->nullable();
            }

            if (! Schema::hasColumn('visits', 'calendar_email')) {
                $table->string('calendar_email')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('visits', function (Blueprint $table): void {
            $table->dropColumn(array_values(array_filter(
                ['calendar_event_id', 'calendar_email'],
                fn (string $column): bool => Schema::hasColumn('visits', $column),
            )));
        });
    }
};

<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Position des propriétaires et des entreprises, posée depuis leur adresse
 * comme celle des agences, agents et partenaires : la fiche gagne « Voir sur
 * la carte » et la carte Google dans le bloc Contact (29 octobre 2026). Rejouable.
 */
return new class extends Migration
{
    /** @var list<string> */
    private array $tables = ['owners', 'companies'];

    public function up(): void
    {
        foreach ($this->tables as $table) {
            if (Schema::hasColumn($table, 'latitude')) {
                continue;
            }

            Schema::table($table, function (Blueprint $blueprint): void {
                $blueprint->decimal('latitude', 10, 7)->nullable();
                $blueprint->decimal('longitude', 10, 7)->nullable();
            });
        }
    }

    public function down(): void
    {
        foreach ($this->tables as $table) {
            if (! Schema::hasColumn($table, 'latitude')) {
                continue;
            }

            Schema::table($table, function (Blueprint $blueprint): void {
                $blueprint->dropColumn(['latitude', 'longitude']);
            });
        }
    }
};

<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Position des agences, des agents et des partenaires, pour les montrer sur
 * une carte. Posée depuis leur adresse, comme celle des biens.
 */
return new class extends Migration
{
    /** @var list<string> */
    private array $tables = ['agencies', 'agents', 'partners'];

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
            Schema::table($table, function (Blueprint $blueprint): void {
                $blueprint->dropColumn(['latitude', 'longitude']);
            });
        }
    }
};

<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Date du dernier échange avec une agence ou un agent, comme pour les
 * partenaires : elle sert à repérer ceux qu'on n'a pas appelés depuis
 * longtemps.
 */
return new class extends Migration
{
    /** @var list<string> */
    private array $tables = ['agencies', 'agents'];

    public function up(): void
    {
        foreach ($this->tables as $table) {
            if (Schema::hasColumn($table, 'last_contacted_at')) {
                continue;
            }

            Schema::table($table, function (Blueprint $blueprint): void {
                $blueprint->timestamp('last_contacted_at')->nullable();
            });
        }
    }

    public function down(): void
    {
        foreach ($this->tables as $table) {
            Schema::table($table, fn (Blueprint $blueprint) => $blueprint->dropColumn('last_contacted_at'));
        }
    }
};

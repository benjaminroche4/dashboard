<?php

declare(strict_types=1);

use Carbon\CarbonImmutable;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Le prochain recontact d'un lead porte une heure (décision du 28 octobre
 * 2026) : la colonne passe de date à date-heure, et les recontacts déjà
 * planifiés sont posés à 10:00, le créneau proposé par défaut. Rejouable.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('leads', 'recontact_at') || Schema::getColumnType('leads', 'recontact_at') === 'datetime') {
            return;
        }

        Schema::table('leads', function (Blueprint $table): void {
            $table->dateTime('recontact_at')->nullable()->change();
        });

        foreach (DB::table('leads')->select('id', 'recontact_at')->whereNotNull('recontact_at')->cursor() as $lead) {
            $at = CarbonImmutable::parse((string) $lead->recontact_at);

            if ($at->format('H:i:s') === '00:00:00') {
                DB::table('leads')->where('id', $lead->id)->update(['recontact_at' => $at->setTime(10, 0)]);
            }
        }
    }

    public function down(): void
    {
        if (! Schema::hasColumn('leads', 'recontact_at') || Schema::getColumnType('leads', 'recontact_at') === 'date') {
            return;
        }

        Schema::table('leads', function (Blueprint $table): void {
            $table->date('recontact_at')->nullable()->change();
        });
    }
};

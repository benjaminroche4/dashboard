<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Référence à rappeler sur le virement, à côté du compte d'encaissement. Une
 * banque étrangère demande souvent une communication pour rapprocher le
 * paiement ; comme le compte, elle est figée sur le document.
 */
return new class extends Migration
{
    public function up(): void
    {
        foreach (['invoices', 'quotes'] as $table) {
            if (Schema::hasColumn($table, 'bank_reference')) {
                continue;
            }

            Schema::table($table, function (Blueprint $blueprint): void {
                $blueprint->string('bank_reference', 120)->nullable()->after('bank_iban');
            });
        }
    }

    public function down(): void
    {
        foreach (['invoices', 'quotes'] as $table) {
            if (! Schema::hasColumn($table, 'bank_reference')) {
                continue;
            }

            Schema::table($table, function (Blueprint $blueprint): void {
                $blueprint->dropColumn('bank_reference');
            });
        }
    }
};

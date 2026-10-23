<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * BIC (SWIFT) du compte d'encaissement : un client hors zone SEPA en a besoin
 * pour virer. Comme l'IBAN, il est figé sur le document.
 */
return new class extends Migration
{
    public function up(): void
    {
        foreach (['invoices', 'quotes'] as $table) {
            if (Schema::hasColumn($table, 'bank_bic')) {
                continue;
            }

            Schema::table($table, function (Blueprint $blueprint): void {
                $blueprint->string('bank_bic', 11)->nullable()->after('bank_iban');
            });
        }
    }

    public function down(): void
    {
        foreach (['invoices', 'quotes'] as $table) {
            if (! Schema::hasColumn($table, 'bank_bic')) {
                continue;
            }

            Schema::table($table, function (Blueprint $blueprint): void {
                $blueprint->dropColumn('bank_bic');
            });
        }
    }
};

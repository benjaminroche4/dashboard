<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Compte bancaire d'encaissement, choisi document par document : une société
 * encaisse sur plusieurs comptes selon la devise et la destination. Les
 * coordonnées sont figées sur le document — une facture émise garde son
 * compte même si la configuration change ensuite. Null = compte par défaut de
 * la devise (`App\Support\BankAccounts`).
 */
return new class extends Migration
{
    public function up(): void
    {
        foreach (['invoices', 'quotes'] as $table) {
            Schema::table($table, function (Blueprint $blueprint): void {
                $blueprint->string('bank_name')->nullable()->after('notes');
                $blueprint->string('bank_iban', 60)->nullable()->after('bank_name');
            });
        }
    }

    public function down(): void
    {
        foreach (['invoices', 'quotes'] as $table) {
            Schema::table($table, function (Blueprint $blueprint): void {
                $blueprint->dropColumn(['bank_name', 'bank_iban']);
            });
        }
    }
};

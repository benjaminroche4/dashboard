<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Devis créé depuis une facture (sens inverse de `quotes.invoice_id`) : la
 * facture annulée garde le lien vers le devis qui la remplace.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('invoices', 'quote_id')) {
            return;
        }

        Schema::table('invoices', function (Blueprint $table): void {
            $table->foreignId('quote_id')->nullable()->after('partner_id')->constrained('quotes')->nullOnDelete();
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('invoices', 'quote_id')) {
            return;
        }

        Schema::table('invoices', function (Blueprint $table): void {
            // La clé étrangère d'abord, l'index qu'elle porte ensuite (MySQL), puis la colonne.
            $table->dropConstrainedForeignId('quote_id');
        });
    }
};

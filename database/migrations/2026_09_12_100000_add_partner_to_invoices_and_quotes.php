<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Un devis ou une facture peut être adressé à un partenaire, pas seulement à
 * un lead ou à un client : sa fiche garde alors l'historique de ce qu'on lui a
 * facturé. Le partenaire supprimé, le document reste, sans rattachement.
 */
return new class extends Migration
{
    /** @var list<string> */
    private array $tables = ['invoices', 'quotes'];

    public function up(): void
    {
        foreach ($this->tables as $table) {
            if (Schema::hasColumn($table, 'partner_id')) {
                continue;
            }

            Schema::table($table, function (Blueprint $blueprint): void {
                $blueprint->foreignId('partner_id')->nullable()->constrained()->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        foreach ($this->tables as $table) {
            Schema::table($table, fn (Blueprint $blueprint) => $blueprint->dropConstrainedForeignId('partner_id'));
        }
    }
};

<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Ce que le garant fait dans la vie : un revenu sans métier ne dit pas grand
 * chose à une agence, qui juge la solidité de la garantie sur la situation
 * professionnelle autant que sur le montant.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('lead_guarantors', 'occupation')) {
            return;
        }

        Schema::table('lead_guarantors', function (Blueprint $table): void {
            $table->string('employment_status', 40)->nullable()->after('phone');
            $table->string('occupation')->nullable()->after('employment_status');
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('lead_guarantors', 'occupation')) {
            return;
        }

        Schema::table('lead_guarantors', function (Blueprint $table): void {
            $table->dropColumn(['employment_status', 'occupation']);
        });
    }
};

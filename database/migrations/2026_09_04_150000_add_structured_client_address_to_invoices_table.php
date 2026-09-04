<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table): void {
            $table->string('client_street')->nullable()->after('client_email');
            $table->string('client_postal_code', 32)->nullable()->after('client_street');
            $table->string('client_city')->nullable()->after('client_postal_code');
            $table->string('client_country', 64)->nullable()->after('client_city');
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table): void {
            $table->dropColumn(['client_street', 'client_postal_code', 'client_city', 'client_country']);
        });
    }
};

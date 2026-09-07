<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agents', function (Blueprint $table): void {
            // Adresse professionnelle, utile pour un agent indépendant.
            $table->string('street')->nullable()->after('position');
            $table->string('postal_code', 20)->nullable()->after('street');
            $table->string('city')->nullable()->after('postal_code');
        });
    }

    public function down(): void
    {
        Schema::table('agents', function (Blueprint $table): void {
            $table->dropColumn(['street', 'postal_code', 'city']);
        });
    }
};

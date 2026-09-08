<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            // Niveau d'accès par section du site (null = ceux du rôle) et fonctions affichées.
            $table->json('permissions')->nullable()->after('role');
            $table->json('functions')->nullable()->after('permissions');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn(['permissions', 'functions']);
        });
    }
};

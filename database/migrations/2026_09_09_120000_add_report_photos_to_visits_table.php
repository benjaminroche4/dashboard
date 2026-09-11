<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('visits', 'report_photos')) {
            return;
        }

        Schema::table('visits', function (Blueprint $table): void {
            // Chemins des photos du compte rendu sur le disque public.
            $table->json('report_photos')->nullable()->after('report');
        });
    }

    public function down(): void
    {
        Schema::table('visits', function (Blueprint $table): void {
            $table->dropColumn('report_photos');
        });
    }
};

<?php

declare(strict_types=1);

use App\Enums\PropertyStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('properties', function (Blueprint $table): void {
            // Disponibilité du bien : disponible, sous option, loué, en travaux, non disponible.
            $table->string('status', 32)->default(PropertyStatus::Available->value)->index()->after('district');
        });
    }

    public function down(): void
    {
        Schema::table('properties', function (Blueprint $table): void {
            $table->dropColumn('status');
        });
    }
};

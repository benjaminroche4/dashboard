<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Position du bien proposé, géocodée depuis son adresse : « Voir sur la carte » sur la fiche. Rejouable. */
    public function up(): void
    {
        Schema::table('lead_properties', function (Blueprint $table): void {
            if (! Schema::hasColumn('lead_properties', 'latitude')) {
                $table->decimal('latitude', 10, 7)->nullable()->after('place_id');
            }

            if (! Schema::hasColumn('lead_properties', 'longitude')) {
                $table->decimal('longitude', 10, 7)->nullable()->after('latitude');
            }
        });
    }

    public function down(): void
    {
        Schema::table('lead_properties', function (Blueprint $table): void {
            $table->dropColumn(array_filter(['latitude', 'longitude'], fn (string $column): bool => Schema::hasColumn('lead_properties', $column)));
        });
    }
};

<?php

declare(strict_types=1);

use App\Enums\PropertyFloor;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * L'étage d'un bien devient une liste fermée (`App\Enums\PropertyFloor`) : les
 * étages déjà saisis sont repris, ceux au-delà du 7e passent en « et plus ».
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('properties', 'floor_choice')) {
            return;
        }

        Schema::table('properties', function (Blueprint $table): void {
            $table->string('floor_choice', 10)->nullable()->after('surface_m2');
        });

        foreach (DB::table('properties')->select('id', 'floor')->whereNotNull('floor')->cursor() as $property) {
            DB::table('properties')
                ->where('id', $property->id)
                ->update(['floor_choice' => PropertyFloor::fromNumber((int) $property->floor)?->value]);
        }

        Schema::table('properties', function (Blueprint $table): void {
            $table->dropColumn('floor');
        });

        Schema::table('properties', function (Blueprint $table): void {
            $table->renameColumn('floor_choice', 'floor');
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('properties', 'floor')) {
            return;
        }

        Schema::table('properties', function (Blueprint $table): void {
            $table->smallInteger('floor_number')->nullable()->after('surface_m2');
        });

        foreach (DB::table('properties')->select('id', 'floor')->whereNotNull('floor')->cursor() as $property) {
            $floor = PropertyFloor::tryFrom((string) $property->floor);

            DB::table('properties')->where('id', $property->id)->update([
                'floor_number' => match ($floor) {
                    null, PropertyFloor::Top => null,
                    PropertyFloor::Ground => 0,
                    PropertyFloor::Above => 8,
                    default => (int) $floor->value,
                },
            ]);
        }

        Schema::table('properties', function (Blueprint $table): void {
            $table->dropColumn('floor');
        });

        Schema::table('properties', function (Blueprint $table): void {
            $table->renameColumn('floor_number', 'floor');
        });
    }
};

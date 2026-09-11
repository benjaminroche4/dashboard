<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Détails d'un bien alignés sur le formulaire « Proposer un bien » du site :
 * chambres, salles de bain, étages de l'immeuble, dépôt de garantie,
 * orientations et équipements.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('properties', function (Blueprint $table): void {
            if (! Schema::hasColumn('properties', 'bedrooms')) {
                $table->unsignedSmallInteger('bedrooms')->nullable()->after('rooms');
                $table->unsignedSmallInteger('bathrooms')->nullable()->after('bedrooms');
            }

            if (! Schema::hasColumn('properties', 'building_floors')) {
                $table->unsignedSmallInteger('building_floors')->nullable()->after('floor');
            }

            if (! Schema::hasColumn('properties', 'deposit_cents')) {
                $table->unsignedInteger('deposit_cents')->nullable()->after('charges_included');
            }

            if (! Schema::hasColumn('properties', 'orientations')) {
                $table->json('orientations')->nullable()->after('building_floors');
                $table->json('amenities')->nullable()->after('orientations');
            }
        });
    }

    public function down(): void
    {
        Schema::table('properties', function (Blueprint $table): void {
            foreach (['bedrooms', 'bathrooms', 'building_floors', 'deposit_cents', 'orientations', 'amenities'] as $column) {
                if (Schema::hasColumn('properties', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};

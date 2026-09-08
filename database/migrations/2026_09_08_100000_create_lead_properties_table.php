<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Bien proposé à la location par un lead propriétaire (formulaire « Proposer un bien »). Tout est facultatif : le contact suffit.
        Schema::create('lead_properties', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('lead_id')->unique()->constrained('leads')->cascadeOnDelete();
            $table->string('address')->nullable();
            $table->string('place_id')->nullable();
            $table->string('property_type', 32)->nullable();
            $table->string('property_status', 32)->nullable();
            $table->unsignedTinyInteger('bedrooms')->nullable();
            $table->unsignedTinyInteger('bathrooms')->nullable();
            $table->unsignedSmallInteger('surface')->nullable();
            $table->smallInteger('floor')->nullable();
            $table->unsignedTinyInteger('building_floors')->nullable();
            $table->string('furnishing', 32)->nullable();
            $table->json('orientations')->nullable();
            $table->json('lease_types')->nullable();
            $table->unsignedInteger('rent_cents')->nullable();
            $table->unsignedInteger('charges_cents')->nullable();
            $table->unsignedInteger('deposit_cents')->nullable();
            $table->json('amenities')->nullable();
            $table->text('note')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lead_properties');
    }
};

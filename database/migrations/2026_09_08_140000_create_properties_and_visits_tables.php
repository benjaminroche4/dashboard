<?php

declare(strict_types=1);

use App\Enums\Currency;
use App\Enums\VisitStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Biens : annuaire des logements que l'équipe peut proposer et faire visiter.
        Schema::create('properties', function (Blueprint $table): void {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('title')->nullable();
            $table->string('street');
            $table->string('postal_code', 20)->nullable();
            $table->string('city')->nullable();
            $table->unsignedTinyInteger('district')->nullable();
            $table->string('property_type', 32)->nullable();
            $table->string('furnished', 32)->nullable();
            $table->unsignedTinyInteger('rooms')->nullable();
            $table->unsignedSmallInteger('surface_m2')->nullable();
            $table->smallInteger('floor')->nullable();
            $table->string('lease_type', 32)->nullable();
            $table->unsignedInteger('rent_cents')->nullable();
            $table->unsignedInteger('charges_cents')->nullable();
            $table->string('currency', 3)->default(Currency::EUR->value);
            $table->string('listing_url', 2048)->nullable();
            $table->foreignId('agent_id')->nullable()->constrained('agents')->nullOnDelete();
            $table->foreignId('owner_id')->nullable()->constrained('owners')->nullOnDelete();
            // Chemins des photos sur le disque public (dossier `properties/`).
            $table->json('photos')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // Visites : un client (lead converti) visite un bien à une date donnée.
        Schema::create('visits', function (Blueprint $table): void {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('lead_id')->constrained('leads')->cascadeOnDelete();
            $table->foreignId('property_id')->constrained('properties')->cascadeOnDelete();
            $table->foreignId('agent_id')->nullable()->constrained('agents')->nullOnDelete();
            // Membre de l'équipe qui réalise la visite.
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('scheduled_at')->index();
            $table->string('status', 32)->default(VisitStatus::Planned->value)->index();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('visits');
        Schema::dropIfExists('properties');
    }
};

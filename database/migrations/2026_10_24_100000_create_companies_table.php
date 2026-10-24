<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Entreprises de l'annuaire (employeurs des clients, sociétés qui relogent
 * leurs salariés) : plusieurs contacts, dont plusieurs principaux possibles,
 * et des dossiers clients rattachés par `leads.company_id`.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('companies')) {
            Schema::create('companies', function (Blueprint $table): void {
                $table->id();
                $table->uuid('uuid')->unique();
                $table->string('name')->index();
                $table->string('email')->nullable();
                $table->string('phone', 40)->nullable();
                $table->string('website', 2048)->nullable();
                $table->string('street')->nullable();
                $table->string('postal_code', 20)->nullable();
                $table->string('city')->nullable();
                $table->text('notes')->nullable();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('company_contacts')) {
            Schema::create('company_contacts', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
                $table->string('first_name');
                $table->string('last_name');
                $table->string('position')->nullable();
                // Plusieurs contacts principaux possibles : pas d'unicité.
                $table->boolean('is_primary')->default(false);
                $table->string('email')->nullable();
                $table->string('phone', 40)->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasColumn('leads', 'company_id')) {
            Schema::table('leads', function (Blueprint $table): void {
                $table->foreignId('company_id')->nullable()->after('company')->constrained('companies')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('leads', 'company_id')) {
            Schema::table('leads', function (Blueprint $table): void {
                // Clé étrangère avant la colonne : MySQL refuse l'ordre inverse.
                $table->dropConstrainedForeignId('company_id');
            });
        }

        Schema::dropIfExists('company_contacts');
        Schema::dropIfExists('companies');
    }
};

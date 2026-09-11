<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('owners', function (Blueprint $table): void {
            $table->id();
            // Identifiant public (URL) ; la clé primaire reste l'entier.
            $table->uuid('uuid')->unique();
            $table->string('first_name');
            $table->string('last_name');
            $table->string('company')->nullable();
            $table->string('email')->nullable();
            $table->string('phone', 40)->nullable();
            // Adresse du bien (ou du principal) à Paris.
            $table->string('street')->nullable();
            $table->string('postal_code', 20)->nullable();
            $table->string('city')->nullable();
            $table->unsignedSmallInteger('property_count')->default(1);
            $table->string('status', 32)->default('to_contact')->index();
            $table->timestamp('last_contacted_at')->nullable();
            $table->text('notes')->nullable();
            // Lead créé à partir du propriétaire (gestion locative), s'il a été converti.
            $table->foreignId('lead_id')->nullable()->constrained('leads')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // Type de demande du site (recherche de logement, gestion locative…) : sépare les leads propriétaires.
        Schema::table('leads', function (Blueprint $table): void {
            $table->string('help_type', 32)->nullable()->index()->after('source_note');
        });
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table): void {
            $table->dropColumn('help_type');
        });

        Schema::dropIfExists('owners');
    }
};

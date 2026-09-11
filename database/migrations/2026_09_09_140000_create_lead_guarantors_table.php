<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Garants d'un dossier : de simples fiches de contact saisies par l'équipe,
 * indépendantes des listes de documents.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('lead_guarantors')) {
            return;
        }

        Schema::create('lead_guarantors', function (Blueprint $table): void {
            $table->id();
            $table->uuid()->unique();
            $table->foreignId('lead_id')->constrained()->cascadeOnDelete();
            $table->string('first_name');
            $table->string('last_name');
            $table->string('email')->nullable();
            $table->string('phone', 40)->nullable();
            $table->unsignedBigInteger('income_cents')->nullable();
            $table->text('note')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lead_guarantors');
    }
};

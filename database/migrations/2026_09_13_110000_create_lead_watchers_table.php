<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Personnes de suivi d'un dossier : des gens à qui on met simplement une
 * adresse e-mail (un parent, un contact RH, un proche) pour qu'ils reçoivent
 * une copie des e-mails du dossier. Ce ne sont pas des membres de l'équipe.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('lead_watchers')) {
            return;
        }

        Schema::create('lead_watchers', function (Blueprint $table): void {
            $table->id();
            $table->uuid()->unique();
            $table->foreignId('lead_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('email');
            $table->string('role')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            // Deux fois la même adresse sur un dossier n'a pas de sens.
            $table->unique(['lead_id', 'email']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lead_watchers');
    }
};

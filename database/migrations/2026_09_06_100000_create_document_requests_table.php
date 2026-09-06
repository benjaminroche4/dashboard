<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_requests', function (Blueprint $table): void {
            $table->id();
            $table->string('first_name');
            $table->string('last_name');
            $table->string('language', 2)->default('fr');
            $table->text('message')->nullable();
            $table->string('upload_url', 2048);
            // Personnes du foyer : [{role: 'tenant'|'guarantor', documents: ['payslips', ...]}], 1 à 4.
            $table->json('persons');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            // Lead à l'origine de la liste, facultatif.
            $table->foreignId('lead_id')->nullable()->constrained('leads')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_requests');
    }
};

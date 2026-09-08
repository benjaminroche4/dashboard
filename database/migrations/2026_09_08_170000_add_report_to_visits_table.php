<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('visits', function (Blueprint $table): void {
            // Compte rendu rédigé après la visite par le membre qui l'a réalisée.
            $table->text('report')->nullable()->after('notes');
            $table->dateTime('report_submitted_at')->nullable()->after('report');
            $table->foreignId('report_submitted_by')->nullable()->after('report_submitted_at')->constrained('users')->nullOnDelete();
            // Rappel automatique envoyé au responsable une fois la visite passée (une seule fois).
            $table->dateTime('report_reminded_at')->nullable()->after('report_submitted_by');
        });
    }

    public function down(): void
    {
        Schema::table('visits', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('report_submitted_by');
            $table->dropColumn(['report', 'report_submitted_at', 'report_reminded_at']);
        });
    }
};

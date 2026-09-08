<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table): void {
            // Compte rendu de l'appel vidéo, rédigé après la visio par le conseiller.
            $table->text('visio_report')->nullable()->after('visio_meet_link');
            $table->dateTime('visio_report_submitted_at')->nullable()->after('visio_report');
            $table->foreignId('visio_report_submitted_by')->nullable()->after('visio_report_submitted_at')->constrained('users')->nullOnDelete();
            // Rappel automatique envoyé au responsable une fois la visio passée (une seule fois par créneau).
            $table->dateTime('visio_report_reminded_at')->nullable()->after('visio_report_submitted_by');
        });
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('visio_report_submitted_by');
            $table->dropColumn(['visio_report', 'visio_report_submitted_at', 'visio_report_reminded_at']);
        });
    }
};

<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Ordre manuel dans une colonne du kanban, historique des statuts et notes internes.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table): void {
            $table->unsignedInteger('position')->default(0)->after('status');
        });

        // Les leads existants gardent leur ordre actuel (plus récent en haut).
        $position = [];
        foreach (DB::table('leads')->latest()->orderByDesc('id')->get(['id', 'status']) as $lead) {
            $position[$lead->status] = ($position[$lead->status] ?? -1) + 1;
            DB::table('leads')->where('id', $lead->id)->update(['position' => $position[$lead->status]]);
        }

        Schema::create('lead_status_changes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('lead_id')->constrained()->cascadeOnDelete();
            $table->string('from_status')->nullable();
            $table->string('to_status');
            $table->foreignId('changed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at');
        });

        Schema::create('lead_notes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('lead_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->text('body');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lead_notes');
        Schema::dropIfExists('lead_status_changes');
        Schema::table('leads', function (Blueprint $table): void {
            $table->dropColumn('position');
        });
    }
};

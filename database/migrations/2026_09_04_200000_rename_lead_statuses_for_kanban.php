<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Les statuts deviennent les colonnes du kanban : à traiter, en cours, devis envoyé, converti, archivé.
return new class extends Migration
{
    public function up(): void
    {
        foreach (['new' => 'todo', 'contacted' => 'in_progress', 'in_discussion' => 'in_progress', 'lost' => 'archived'] as $from => $to) {
            DB::table('leads')->where('status', $from)->update(['status' => $to]);
        }
    }

    public function down(): void
    {
        foreach (['todo' => 'new', 'in_progress' => 'contacted', 'quote_sent' => 'contacted', 'archived' => 'lost'] as $from => $to) {
            DB::table('leads')->where('status', $from)->update(['status' => $to]);
        }
    }
};

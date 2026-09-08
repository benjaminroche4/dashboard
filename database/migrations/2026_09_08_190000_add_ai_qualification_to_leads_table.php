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
            // Proposition de qualification de l'assistant IA, en attente de relecture (null une fois appliquée ou ignorée).
            $table->json('ai_qualification')->nullable()->after('qualification_note');
            $table->timestamp('ai_qualified_at')->nullable()->after('ai_qualification');
        });
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table): void {
            $table->dropColumn(['ai_qualification', 'ai_qualified_at']);
        });
    }
};

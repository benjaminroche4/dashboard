<?php

declare(strict_types=1);

use App\Enums\ClientPriority;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table): void {
            // Priorité du dossier client (lead converti), « Normale » par défaut.
            $table->string('priority', 16)->default(ClientPriority::Normal->value)->after('score');
        });
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table): void {
            $table->dropColumn('priority');
        });
    }
};

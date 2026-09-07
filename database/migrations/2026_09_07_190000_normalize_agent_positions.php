<?php

declare(strict_types=1);

use App\Enums\AgentPosition;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Les fonctions saisies en texte libre (« Négociateur », « Directrice d’agence »)
     * deviennent des valeurs d'AgentPosition ; un texte inconnu devient « Autre ».
     */
    public function up(): void
    {
        DB::table('agents')
            ->whereNotNull('position')
            ->whereNotIn('position', AgentPosition::values())
            ->orderBy('id')
            ->each(function (object $agent): void {
                DB::table('agents')->where('id', $agent->id)->update([
                    'position' => AgentPosition::parse((string) $agent->position)?->value,
                ]);
            });
    }

    public function down(): void
    {
        // Les libellés d'origine ne sont pas conservés : rien à restaurer.
    }
};

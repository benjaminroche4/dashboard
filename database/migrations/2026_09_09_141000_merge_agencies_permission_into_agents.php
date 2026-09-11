<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * « Agences » n'est plus une section distincte : agents et agences se gèrent
 * ensemble. Le niveau enregistré pour l'ancienne section est fusionné dans
 * « Agents et agences », le plus restrictif des deux l'emportant.
 */
return new class extends Migration
{
    /** Rang d'un niveau, pour garder le plus restrictif. */
    private const array RANKS = ['none' => 0, 'read' => 1, 'write' => 2, 'manage' => 3];

    public function up(): void
    {
        foreach (DB::table('users')->whereNotNull('permissions')->get(['id', 'permissions']) as $user) {
            /** @var array<string, string> $permissions */
            $permissions = json_decode((string) $user->permissions, true) ?: [];

            if (! array_key_exists('agencies', $permissions)) {
                continue;
            }

            $agencies = $permissions['agencies'];
            $agents = $permissions['agents'] ?? null;
            unset($permissions['agencies']);

            $permissions['agents'] = $agents === null
                ? $agencies
                : (self::RANKS[$agencies] <= self::RANKS[$agents] ? $agencies : $agents);

            // « agents » vient d'être posé : la carte n'est jamais vide ici.
            DB::table('users')->where('id', $user->id)->update([
                'permissions' => json_encode($permissions),
            ]);
        }
    }

    public function down(): void
    {
        // Rien à défaire : la section « Agences » a disparu du code.
    }
};

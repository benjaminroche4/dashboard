<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Nouveaux motifs de perte, tels que l'équipe les qualifie : les anciens
 * motifs sont repris sur le plus proche, « Sans réponse » devenant « Autre ».
 */
return new class extends Migration
{
    /** @var array<string, string> */
    private array $map = [
        'too_expensive' => 'small_budget',
        'went_elsewhere' => 'bad_closing',
        'out_of_scope' => 'not_qualified',
        'no_answer' => 'other',
    ];

    public function up(): void
    {
        foreach ($this->map as $old => $new) {
            DB::table('leads')->where('loss_reason', $old)->update(['loss_reason' => $new]);
        }
    }

    public function down(): void
    {
        foreach ($this->map as $old => $new) {
            DB::table('leads')->where('loss_reason', $new)->update(['loss_reason' => $old]);
        }
    }
};

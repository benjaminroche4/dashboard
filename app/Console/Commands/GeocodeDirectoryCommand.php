<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Actions\Directory\GeocodeDirectoryEntry;
use App\Models\Agency;
use App\Models\Agent;
use App\Models\Partner;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Builder;

/**
 * Rattrapage des positions de l'annuaire (agences, agents, partenaires).
 */
final class GeocodeDirectoryCommand extends Command
{
    protected $signature = 'directory:geocode {--all : Reprend aussi les entrées déjà positionnées}';

    protected $description = 'Pose la position des agences, agents et partenaires depuis leur adresse (Google Geocoding)';

    public function handle(GeocodeDirectoryEntry $geocode): int
    {
        $located = 0;
        $total = 0;

        foreach ([Agency::class, Agent::class, Partner::class] as $model) {
            $entries = $model::query()
                ->whereNotNull('street')
                ->unless($this->option('all'), fn (Builder $query): Builder => $query->whereNull('latitude'))
                ->orderBy('id')
                ->get();

            $total += $entries->count();
            $located += $entries->filter(fn (Agency|Agent|Partner $entry): bool => $geocode->handle($entry))->count();
        }

        $this->info("{$located} entrée(s) positionnée(s) sur {$total}.");

        return self::SUCCESS;
    }
}

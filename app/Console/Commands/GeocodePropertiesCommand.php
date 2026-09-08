<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Actions\Properties\GeocodeProperty;
use App\Models\Property;
use Illuminate\Console\Command;

final class GeocodePropertiesCommand extends Command
{
    protected $signature = 'properties:geocode {--all : Reprend aussi les biens déjà positionnés}';

    protected $description = 'Pose la position des biens sans coordonnées depuis leur adresse (Google Geocoding)';

    public function handle(GeocodeProperty $geocode): int
    {
        $properties = Property::query()
            ->unless($this->option('all'), fn ($query) => $query->whereNull('latitude'))
            ->orderBy('id')
            ->get();

        $located = $properties->filter(fn (Property $property): bool => $geocode->handle($property))->count();

        $this->info("{$located} bien(s) positionné(s) sur {$properties->count()}.");

        return self::SUCCESS;
    }
}

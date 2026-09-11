<?php

declare(strict_types=1);

namespace App\Actions\Directory;

use App\Models\Agency;
use App\Models\Agent;
use App\Models\Partner;
use App\Services\Geocoder;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Pose la position d'une agence, d'un agent ou d'un partenaire depuis son
 * adresse (Google Geocoding), comme pour un bien. Sans clé, adresse
 * introuvable ou API en panne : l'entrée reste sans position et la requête
 * n'échoue jamais.
 */
final readonly class GeocodeDirectoryEntry
{
    public function __construct(private Geocoder $geocoder) {}

    public function handle(Agency|Agent|Partner $entry): bool
    {
        if (! $this->geocoder->isConfigured() || $entry->street === null) {
            return false;
        }

        try {
            $location = $this->geocoder->geocode(self::address($entry));
        } catch (Throwable $exception) {
            Log::warning('Géocodage de l’annuaire impossible.', [
                'entry' => $entry::class.'#'.$entry->id,
                'error' => $exception->getMessage(),
            ]);

            return false;
        }

        $entry->forceFill([
            'latitude' => $location['lat'] ?? null,
            'longitude' => $location['lng'] ?? null,
        ])->saveQuietly();

        return $location !== null;
    }

    /** Vrai si l'adresse a changé, ou si l'entrée n'a pas encore de position. */
    public function shouldGeocode(Agency|Agent|Partner $entry): bool
    {
        return $entry->wasChanged(['street', 'postal_code', 'city'])
            || $entry->latitude === null;
    }

    /** Adresse sur une ligne : rue, code postal, ville, pays. */
    public static function address(Agency|Agent|Partner $entry): string
    {
        return implode(', ', array_filter([
            $entry->street,
            trim(($entry->postal_code ?? '').' '.($entry->city ?? '')),
            'France',
        ]));
    }
}

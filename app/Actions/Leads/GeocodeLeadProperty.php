<?php

declare(strict_types=1);

namespace App\Actions\Leads;

use App\Models\LeadProperty;
use App\Services\Geocoder;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Pose la position du bien proposé par un lead propriétaire depuis son adresse
 * (Google Geocoding), pour « Voir sur la carte » sur la fiche. Sans clé, sans
 * adresse ou API en panne : le bien reste sans position, rien n'échoue.
 */
final readonly class GeocodeLeadProperty
{
    public function __construct(private Geocoder $geocoder) {}

    public function handle(LeadProperty $property): bool
    {
        if (! $this->geocoder->isConfigured()) {
            return false;
        }

        if ($property->address === null) {
            if ($property->latitude !== null) {
                $property->forceFill(['latitude' => null, 'longitude' => null])->saveQuietly();
            }

            return false;
        }

        try {
            $location = $this->geocoder->geocode($property->address);
        } catch (Throwable $exception) {
            Log::warning('Géocodage du bien proposé impossible.', [
                'lead_property' => $property->id,
                'error' => $exception->getMessage(),
            ]);

            return false;
        }

        $property->forceFill([
            'latitude' => $location['lat'] ?? null,
            'longitude' => $location['lng'] ?? null,
        ])->saveQuietly();

        return $location !== null;
    }

    /** Vrai si l'adresse a changé, ou si le bien n'a pas encore de position. */
    public function shouldGeocode(LeadProperty $property): bool
    {
        return $property->wasChanged(['address', 'place_id']) || $property->wasRecentlyCreated || $property->latitude === null;
    }
}

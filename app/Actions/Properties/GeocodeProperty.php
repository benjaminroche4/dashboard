<?php

declare(strict_types=1);

namespace App\Actions\Properties;

use App\Models\Property;
use App\Services\Geocoder;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Pose la position d'un bien depuis son adresse (Google Geocoding). Sans clé,
 * adresse introuvable ou API en panne : le bien reste sans position, la
 * requête n'échoue jamais pour autant.
 */
final readonly class GeocodeProperty
{
    public function __construct(private Geocoder $geocoder) {}

    public function handle(Property $property): bool
    {
        if (! $this->geocoder->isConfigured()) {
            return false;
        }

        try {
            $location = $this->geocoder->geocode(self::address($property));
        } catch (Throwable $exception) {
            Log::warning('Géocodage du bien impossible.', ['property' => $property->id, 'error' => $exception->getMessage()]);

            return false;
        }

        $property->forceFill([
            'latitude' => $location['lat'] ?? null,
            'longitude' => $location['lng'] ?? null,
        ])->saveQuietly();

        return $location !== null;
    }

    /** Adresse sur une ligne : rue, code postal, ville, pays. */
    public static function address(Property $property): string
    {
        return implode(', ', array_filter([
            $property->street,
            trim(($property->postal_code ?? '').' '.($property->city ?? 'Paris')),
            'France',
        ]));
    }
}

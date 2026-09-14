<?php

declare(strict_types=1);

namespace App\Actions\Agencies;

use App\Actions\RealEstate\CreateAgency;
use App\Data\AgencyData;
use App\Models\Agency;
use App\Models\User;
use App\Services\GooglePlaces;
use App\Support\ParisArrondissements;
use RuntimeException;

/**
 * Ajoute à l'annuaire une agence trouvée via Google Places : coordonnées lues
 * sur la fiche Google, position reprise, arrondissement du code postal posé
 * comme quartier couvert. Sans doublon : le même lieu renvoie l'agence existante.
 */
final readonly class AddAgencyFromPlace
{
    public function __construct(private GooglePlaces $places, private CreateAgency $create) {}

    /**
     * @throws RuntimeException sans clé Google ou si l'API refuse
     */
    public function handle(string $placeId, ?User $by = null): Agency
    {
        $existing = Agency::query()->where('google_place_id', $placeId)->first();
        if ($existing !== null) {
            return $existing;
        }

        throw_unless($this->places->isConfigured(), RuntimeException::class, 'Google Places non configuré (GOOGLE_MAPS_API_KEY).');
        $place = $this->places->place($placeId);
        throw_if($place['name'] === '', RuntimeException::class, 'Google Places : fiche sans nom.');

        $agency = $this->create->handle(AgencyData::from([
            'name' => $place['name'],
            'street' => $place['street'],
            'postal_code' => $place['postalCode'],
            'city' => $place['city'],
            'phone' => $place['phone'],
            'website' => $place['website'],
        ]), $by);

        $district = ParisArrondissements::fromPostalCode($place['postalCode']);
        $agency->forceFill([
            'google_place_id' => $placeId,
            'latitude' => $place['latitude'] ?? $agency->latitude,
            'longitude' => $place['longitude'] ?? $agency->longitude,
            'districts' => $district === null ? null : [$district],
        ])->save();

        return $agency;
    }
}

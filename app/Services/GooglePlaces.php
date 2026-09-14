<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Client Google Places (API REST) : suggestions d'adresses et détail d'un lieu.
 */
final readonly class GooglePlaces
{
    private const string AUTOCOMPLETE = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';

    private const string DETAILS = 'https://maps.googleapis.com/maps/api/place/details/json';

    private const string TEXT_SEARCH = 'https://maps.googleapis.com/maps/api/place/textsearch/json';

    public function __construct(private ?string $key) {}

    public static function fromConfig(): self
    {
        return new self(config('services.google.maps_key'));
    }

    public function isConfigured(): bool
    {
        return $this->key !== null && $this->key !== '';
    }

    /**
     * @param  list<string>  $regionCodes  Codes pays ISO alpha-2 (minuscules)
     * @param  'address'|'cities'  $kind  Adresses précises, ou villes seulement
     * @return list<array{id: string, main: string, secondary: string}>
     */
    public function suggest(string $input, array $regionCodes, ?string $sessionToken = null, string $kind = 'address'): array
    {
        $response = Http::timeout(10)->get(self::AUTOCOMPLETE, array_filter([
            'input' => $input,
            'language' => 'fr',
            // « (cities) » ne propose que des localités : une ville d'origine
            // n'est ni une rue ni un commerce.
            'types' => $kind === 'cities' ? '(cities)' : 'address',
            'components' => implode('|', array_map(fn (string $code): string => 'country:'.$code, $regionCodes)),
            'sessiontoken' => $sessionToken,
            'key' => $this->key,
        ]));

        $data = $this->payload($response->json(), ['OK', 'ZERO_RESULTS']);

        return array_values(array_map(fn (array $prediction): array => [
            'id' => (string) $prediction['place_id'],
            'main' => (string) ($prediction['structured_formatting']['main_text'] ?? $prediction['description']),
            'secondary' => (string) ($prediction['structured_formatting']['secondary_text'] ?? ''),
        ], $data['predictions'] ?? []));
    }

    /**
     * @return array{street: string, postalCode: string, city: string, countryCode: string|null, countryName: string}
     */
    public function details(string $placeId, ?string $sessionToken = null): array
    {
        $response = Http::timeout(10)->get(self::DETAILS, array_filter([
            'place_id' => $placeId,
            'fields' => 'address_component',
            'language' => 'fr',
            'sessiontoken' => $sessionToken,
            'key' => $this->key,
        ]));

        $data = $this->payload($response->json(), ['OK']);

        return self::parseComponents($data['result']['address_components'] ?? []);
    }

    /**
     * Lieux répondant à une recherche en texte libre (« agence immobilière
     * location 11e »), autour d'un point : pour trouver des agences qui ne sont
     * pas encore dans l'annuaire.
     *
     * @return list<array{id: string, name: string, address: string, rating: float|null, ratings: int, latitude: float|null, longitude: float|null, open: bool|null}>
     */
    public function searchText(string $query, ?float $latitude = null, ?float $longitude = null, int $radius = 1500, string $type = 'real_estate_agency'): array
    {
        $response = Http::timeout(10)->get(self::TEXT_SEARCH, array_filter([
            'query' => $query,
            'language' => 'fr',
            'region' => 'fr',
            'type' => $type,
            'location' => $latitude === null || $longitude === null ? null : "{$latitude},{$longitude}",
            'radius' => $latitude === null ? null : $radius,
            'key' => $this->key,
        ], fn (mixed $value): bool => $value !== null));

        $data = $this->payload($response->json(), ['OK', 'ZERO_RESULTS']);

        return array_values(array_map(fn (array $place): array => [
            'id' => (string) $place['place_id'],
            'name' => (string) ($place['name'] ?? ''),
            'address' => (string) ($place['formatted_address'] ?? ''),
            'rating' => isset($place['rating']) ? (float) $place['rating'] : null,
            'ratings' => (int) ($place['user_ratings_total'] ?? 0),
            'latitude' => isset($place['geometry']['location']['lat']) ? (float) $place['geometry']['location']['lat'] : null,
            'longitude' => isset($place['geometry']['location']['lng']) ? (float) $place['geometry']['location']['lng'] : null,
            'open' => isset($place['business_status']) ? $place['business_status'] === 'OPERATIONAL' : null,
        ], $data['results'] ?? []));
    }

    /**
     * Fiche complète d'un lieu : nom, téléphone, site, adresse décomposée,
     * position, note. Pour ajouter une agence trouvée à l'annuaire.
     *
     * @return array{name: string, phone: string|null, website: string|null, rating: float|null, ratings: int, latitude: float|null, longitude: float|null, street: string, postalCode: string, city: string, countryCode: string|null, countryName: string}
     */
    public function place(string $placeId): array
    {
        $response = Http::timeout(10)->get(self::DETAILS, array_filter([
            'place_id' => $placeId,
            'fields' => 'name,formatted_phone_number,international_phone_number,website,address_component,geometry,rating,user_ratings_total',
            'language' => 'fr',
            'key' => $this->key,
        ]));

        $data = $this->payload($response->json(), ['OK']);
        $result = $data['result'] ?? [];

        return [
            'name' => (string) ($result['name'] ?? ''),
            'phone' => isset($result['international_phone_number']) ? (string) $result['international_phone_number'] : (isset($result['formatted_phone_number']) ? (string) $result['formatted_phone_number'] : null),
            'website' => isset($result['website']) ? (string) $result['website'] : null,
            'rating' => isset($result['rating']) ? (float) $result['rating'] : null,
            'ratings' => (int) ($result['user_ratings_total'] ?? 0),
            'latitude' => isset($result['geometry']['location']['lat']) ? (float) $result['geometry']['location']['lat'] : null,
            'longitude' => isset($result['geometry']['location']['lng']) ? (float) $result['geometry']['location']['lng'] : null,
            ...self::parseComponents($result['address_components'] ?? []),
        ];
    }

    /**
     * @param  list<array{types: list<string>, long_name: string, short_name: string}>  $components
     * @return array{street: string, postalCode: string, city: string, countryCode: string|null, countryName: string}
     */
    public static function parseComponents(array $components): array
    {
        $pick = function (string $type, bool $short = false) use ($components): string {
            foreach ($components as $component) {
                if (in_array($type, $component['types'], true)) {
                    return (string) ($short ? $component['short_name'] : $component['long_name']);
                }
            }

            return '';
        };

        $street = trim($pick('street_number').' '.$pick('route'));

        return [
            'street' => $street,
            'postalCode' => $pick('postal_code'),
            'city' => $pick('locality') ?: $pick('postal_town') ?: $pick('administrative_area_level_2'),
            'countryCode' => $pick('country', true) ?: null,
            'countryName' => $pick('country'),
        ];
    }

    /**
     * @param  list<string>  $accepted
     * @return array<string, mixed>
     */
    private function payload(mixed $json, array $accepted): array
    {
        $data = is_array($json) ? $json : [];
        $status = (string) ($data['status'] ?? 'UNKNOWN');

        if (! in_array($status, $accepted, true)) {
            throw new RuntimeException('Google Places : '.$status.' '.($data['error_message'] ?? ''));
        }

        return $data;
    }
}

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
     * @return list<array{id: string, main: string, secondary: string}>
     */
    public function suggest(string $input, array $regionCodes, ?string $sessionToken = null): array
    {
        $response = Http::timeout(10)->get(self::AUTOCOMPLETE, array_filter([
            'input' => $input,
            'language' => 'fr',
            'types' => 'address',
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

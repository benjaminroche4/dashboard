<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Client Google Geocoding (API REST, clé serveur) : adresse → coordonnées.
 */
final readonly class Geocoder
{
    private const string ENDPOINT = 'https://maps.googleapis.com/maps/api/geocode/json';

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
     * Coordonnées de l'adresse, ou null si Google ne la trouve pas.
     *
     * @return array{lat: float, lng: float}|null
     */
    public function geocode(string $address): ?array
    {
        $response = Http::timeout(10)->get(self::ENDPOINT, [
            'address' => $address,
            'region' => 'fr',
            'language' => 'fr',
            'key' => $this->key,
        ]);

        $data = is_array($response->json()) ? $response->json() : [];
        $status = (string) ($data['status'] ?? 'UNKNOWN');

        if ($status === 'ZERO_RESULTS') {
            return null;
        }

        if ($status !== 'OK') {
            throw new RuntimeException('Google Geocoding : '.$status.' '.($data['error_message'] ?? ''));
        }

        $location = $data['results'][0]['geometry']['location'] ?? null;

        if (! is_array($location) || ! isset($location['lat'], $location['lng'])) {
            return null;
        }

        return ['lat' => (float) $location['lat'], 'lng' => (float) $location['lng']];
    }
}

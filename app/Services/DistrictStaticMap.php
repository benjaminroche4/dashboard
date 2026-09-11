<?php

declare(strict_types=1);

namespace App\Services;

use App\Support\ParisArrondissements;

/**
 * URL Google Static Maps avec les arrondissements visés surlignés, pour les
 * e-mails envoyés aux leads. Les contours sont encodés en polyline pour tenir
 * dans la limite de taille de l'URL ; la vue s'ajuste aux tracés.
 */
final readonly class DistrictStaticMap
{
    private const string FILL = '0x71172e35';

    private const string STROKE = '0x71172eCC';

    /**
     * @param  string|null  $apiKey  clé **dédiée** à l'API Static Maps : elle part dans les e-mails, jamais la clé serveur
     * @param  string|null  $signingSecret  secret de signature d'URL Google (base64 URL-safe) : l'URL signée est inutilisable ailleurs
     */
    public function __construct(
        private ?string $apiKey,
        private ?string $mapId,
        private ?string $signingSecret = null,
    ) {}

    public static function fromConfig(): self
    {
        return new self(
            apiKey: config('services.google.static_maps_key') ?: null,
            mapId: config('services.google.static_map_id') ?: null,
            signingSecret: config('services.google.static_maps_secret') ?: null,
        );
    }

    /**
     * @param  list<int>  $districts
     */
    public function build(array $districts, string $language = 'fr'): ?string
    {
        if ($this->apiKey === null || $this->apiKey === '') {
            return null;
        }

        $paths = [];

        foreach ($districts as $district) {
            $outline = ParisArrondissements::OUTLINES[$district] ?? null;

            if ($outline === null) {
                continue;
            }

            $paths[] = sprintf('fillcolor:%s|color:%s|weight:2|enc:%s', self::FILL, self::STROKE, $this->encodePolyline($outline));
        }

        if ($paths === []) {
            return null;
        }

        $query = http_build_query(array_filter([
            'size' => '560x260',
            'scale' => '2',
            'language' => $language,
            'map_id' => $this->mapId,
            'key' => $this->apiKey,
        ]));

        foreach ($paths as $path) {
            $query .= '&path='.rawurlencode($path);
        }

        $path = '/maps/api/staticmap?'.$query;

        return 'https://maps.googleapis.com'.$this->sign($path);
    }

    /**
     * Signature d'URL Google Maps : HMAC-SHA1 du chemin et de la requête avec le
     * secret décodé (base64 URL-safe), résultat encodé de la même façon.
     */
    /**
     * Carte statique d'un lieu : une épingle sur ses coordonnées, ou sur son
     * adresse à défaut. Renvoie `null` sans clé dédiée ou sans lieu.
     */
    public function place(?float $latitude, ?float $longitude, ?string $address = null, int $zoom = 15): ?string
    {
        if ($this->apiKey === null || $this->apiKey === '') {
            return null;
        }

        $center = $latitude !== null && $longitude !== null
            ? "{$latitude},{$longitude}"
            : ($address === null || trim($address) === '' ? null : trim($address));

        if ($center === null) {
            return null;
        }

        $query = http_build_query(array_filter([
            'size' => '560x200',
            'scale' => '2',
            'zoom' => (string) $zoom,
            'center' => $center,
            'markers' => 'color:0x7f1d3f|'.$center,
            'language' => 'fr',
            'map_id' => $this->mapId,
            'key' => $this->apiKey,
        ]));

        return 'https://maps.googleapis.com'.$this->sign('/maps/api/staticmap?'.$query);
    }

    private function sign(string $pathAndQuery): string
    {
        if ($this->signingSecret === null || $this->signingSecret === '') {
            return $pathAndQuery;
        }

        $secret = base64_decode(strtr($this->signingSecret, '-_', '+/'), true);

        if ($secret === false) {
            return $pathAndQuery;
        }

        $signature = strtr(base64_encode(hash_hmac('sha1', $pathAndQuery, $secret, true)), '+/', '-_');

        return $pathAndQuery.'&signature='.$signature;
    }

    /**
     * Encodage polyline Google (l'anneau est refermé sur son premier point).
     *
     * @param  list<array{0: float, 1: float}>  $points  [longitude, latitude]
     */
    private function encodePolyline(array $points): string
    {
        $points[] = $points[0];
        $encoded = '';
        $previousLat = 0;
        $previousLng = 0;

        foreach ($points as [$lng, $lat]) {
            $latE5 = (int) round($lat * 1e5);
            $lngE5 = (int) round($lng * 1e5);
            $encoded .= $this->encodeNumber($latE5 - $previousLat).$this->encodeNumber($lngE5 - $previousLng);
            $previousLat = $latE5;
            $previousLng = $lngE5;
        }

        return $encoded;
    }

    private function encodeNumber(int $value): string
    {
        $value = $value < 0 ? ~($value << 1) : ($value << 1);
        $chunk = '';

        while ($value >= 0x20) {
            $chunk .= chr((0x20 | ($value & 0x1F)) + 63);
            $value >>= 5;
        }

        return $chunk.chr($value + 63);
    }
}

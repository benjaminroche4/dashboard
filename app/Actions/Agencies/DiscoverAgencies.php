<?php

declare(strict_types=1);

namespace App\Actions\Agencies;

use App\Models\Agency;
use App\Services\GooglePlaces;
use App\Support\ParisArrondissements;
use Illuminate\Support\Facades\Cache;
use RuntimeException;

/**
 * Trouve des agences immobilières dans des arrondissements via Google Places,
 * hors celles déjà dans l'annuaire (même lieu Google, ou même nom dans le
 * même code postal). Résultat en cache un jour par arrondissement : la
 * recherche coûte, les agences d'un quartier ne changent pas d'un jour à l'autre.
 */
final readonly class DiscoverAgencies
{
    public const int LIMIT = 12;

    public function __construct(private GooglePlaces $places) {}

    /**
     * @param  list<int>  $districts
     * @return list<array{id: string, name: string, address: string, rating: float|null, ratings: int, latitude: float|null, longitude: float|null, district: int, known_uuid: string|null}>
     *
     * @throws RuntimeException sans clé Google ou si l'API refuse
     */
    public function handle(array $districts, int $limit = self::LIMIT): array
    {
        throw_unless($this->places->isConfigured(), RuntimeException::class, 'Google Places non configuré (GOOGLE_MAPS_API_KEY).');

        $known = Agency::query()->whereNotNull('google_place_id')->pluck('uuid', 'google_place_id');
        $knownNames = Agency::query()->whereNotNull('postal_code')->get(['uuid', 'name', 'postal_code'])
            ->keyBy(fn (Agency $agency): string => $this->nameKey($agency->name, $agency->postal_code));

        $found = [];
        foreach (array_unique(array_map(intval(...), $districts)) as $district) {
            $centroid = ParisArrondissements::centroid($district);
            if ($centroid === null) {
                continue;
            }
            $label = $district === 1 ? '1er' : "{$district}e";
            $places = Cache::remember(
                "agencies:discover:{$district}",
                now()->addDay(),
                fn (): array => $this->places->searchText("agence immobilière location {$label} arrondissement Paris", $centroid['lat'], $centroid['lng']),
            );

            foreach ($places as $place) {
                if (isset($found[$place['id']]) || $place['open'] === false) {
                    continue;
                }
                $postal = preg_match('/\b(750\d{2})\b/', $place['address'], $m) === 1 ? $m[1] : null;
                $found[$place['id']] = [
                    ...$place,
                    'district' => $district,
                    'known_uuid' => $known[$place['id']] ?? $knownNames->get($this->nameKey($place['name'], $postal))?->uuid,
                ];
            }
        }

        $rows = array_values($found);
        // Les mieux notées d'abord, à condition d'avoir assez d'avis pour que la note veuille dire quelque chose.
        usort($rows, fn (array $a, array $b): int => [$this->weight($b), $b['ratings']] <=> [$this->weight($a), $a['ratings']]);

        return array_slice(array_map(fn (array $row): array => [
            'id' => $row['id'],
            'name' => $row['name'],
            'address' => $row['address'],
            'rating' => $row['rating'],
            'ratings' => $row['ratings'],
            'latitude' => $row['latitude'],
            'longitude' => $row['longitude'],
            'district' => $row['district'],
            'known_uuid' => $row['known_uuid'],
        ], $rows), 0, $limit);
    }

    /**
     * @param  array{rating: float|null, ratings: int}  $place
     */
    private function weight(array $place): float
    {
        return $place['rating'] === null || $place['ratings'] < 5 ? 0.0 : $place['rating'];
    }

    private function nameKey(string $name, ?string $postalCode): string
    {
        return mb_strtolower(trim($name)).'|'.($postalCode ?? '');
    }
}

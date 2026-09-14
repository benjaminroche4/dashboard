<?php

declare(strict_types=1);

namespace App\Actions\Agencies;

use App\Data\AgencyEnrichmentData;
use App\Events\DashboardUpdated;
use App\Models\Agency;
use App\Models\User;
use App\Services\Assistant;
use App\Services\GooglePlaces;
use App\Services\ListingFetcher;
use RuntimeException;

/**
 * Enrichit la fiche d'une agence avec l'assistant : lecture de son site
 * (page d'accueil, et ses pages « agence » / « location » / « honoraires » si
 * on les trouve) et de sa fiche Google, puis proposition de profil stockée
 * dans `ai_profile`. L'équipe relit et applique — rien n'est écrit sur le
 * profil sans elle.
 */
final readonly class EnrichAgency
{
    /** Pages secondaires du site qui parlent de l'agence, cherchées dans les liens de l'accueil. */
    private const array SECONDARY_PAGES = ['agence', 'about', 'a-propos', 'qui-sommes-nous', 'location', 'louer', 'honoraires', 'tarifs', 'frais', 'services'];

    private const int MAX_PAGES = 4;

    private const string SYSTEM = <<<'TXT'
Tu es l'assistant d'une agence de relocation à Paris qui constitue un annuaire d'agences immobilières partenaires. On te donne le texte du site d'une agence (et parfois sa fiche Google). Dresse son profil pour savoir quels clients lui confier.
Règles : ne déduis que ce que le texte affirme ; un champ non renseigné reste null ou vide, jamais deviné. Les arrondissements sont ceux de Paris (1 à 20) — « Paris 11 », « 75011 », « Oberkampf » (11e), « Le Marais » (3e et 4e), « Montmartre » (18e), « Bastille » (11e/12e), « Saint-Germain » (6e) comptent. Les loyers sont mensuels, charges comprises si précisé, en euros. Réponds en français.
TXT;

    public function __construct(private Assistant $assistant, private ListingFetcher $fetcher, private GooglePlaces $places) {}

    /**
     * @return array<string, mixed> la proposition, aussi stockée sur l'agence
     *
     * @throws RuntimeException si l'assistant n'est pas configuré, ou s'il n'y a rien à lire
     */
    public function handle(Agency $agency, ?User $by = null): array
    {
        throw_unless($this->assistant->isConfigured(), RuntimeException::class, 'Assistant IA non configuré (ANTHROPIC_API_KEY).');

        $sources = $this->sources($agency);
        throw_if($sources === [], RuntimeException::class, 'Rien à lire : renseignez le site web de l’agence.');

        $prompt = "Agence : {$agency->name}".($agency->city === null ? '' : " ({$agency->postal_code} {$agency->city})")."\n\n"
            .implode("\n\n", array_map(fn (string $label, string $text): string => "=== {$label} ===\n{$text}", array_keys($sources), $sources));

        $proposal = AgencyEnrichmentData::from($this->assistant->extract(self::SYSTEM, $prompt, AgencyEnrichmentData::schema(), maxTokens: 4_000));

        $agency->forceFill(['ai_profile' => $proposal, 'ai_profile_at' => now()])->save();

        event(new DashboardUpdated('agencies', ['id' => $agency->id], "a fait lire le site de l'agence {$agency->name} par l'assistant : profil à relire", $by));

        return $proposal;
    }

    /**
     * Textes à lire : site (accueil + pages utiles) et fiche Google.
     *
     * @return array<string, string>
     */
    private function sources(Agency $agency): array
    {
        $sources = [];

        if ($agency->website !== null) {
            $home = $this->fetcher->fetchHtml($agency->website);
            if ($home !== null) {
                $sources['Site : accueil'] = ListingFetcher::toText($home);
                foreach ($this->secondaryLinks($agency->website, $home) as $url) {
                    $text = $this->fetcher->fetch($url);
                    if ($text !== null) {
                        $sources["Site : {$url}"] = mb_substr($text, 0, 12_000);
                    }
                }
            }
        }

        if ($agency->google_place_id !== null && $this->places->isConfigured()) {
            try {
                $place = $this->places->place($agency->google_place_id);
                $sources['Fiche Google'] = implode("\n", array_filter([
                    'Nom : '.$place['name'],
                    $place['rating'] === null ? null : "Note : {$place['rating']}/5 ({$place['ratings']} avis)",
                    $place['website'] === null ? null : 'Site : '.$place['website'],
                ]));
            } catch (RuntimeException) {
                // La fiche Google est un bonus : sans elle, le site suffit.
            }
        }

        return array_filter($sources, fn (string $text): bool => trim($text) !== '');
    }

    /**
     * Liens de l'accueil qui mènent aux pages « agence », « location », « honoraires »… du même site.
     *
     * @return list<string>
     */
    private function secondaryLinks(string $website, string $html): array
    {
        $host = parse_url($website, PHP_URL_HOST);
        if (! is_string($host)) {
            return [];
        }
        preg_match_all('/href=["\']([^"\']+)["\']/i', $html, $matches);
        $links = [];
        foreach ($matches[1] as $href) {
            $url = $this->absolute($website, html_entity_decode($href));
            if ($url === null || parse_url($url, PHP_URL_HOST) !== $host) {
                continue;
            }
            $path = strtolower((string) parse_url($url, PHP_URL_PATH));
            foreach (self::SECONDARY_PAGES as $needle) {
                if (str_contains($path, $needle)) {
                    $links[$url] = true;
                    break;
                }
            }
            if (count($links) >= self::MAX_PAGES) {
                break;
            }
        }

        return array_keys($links);
    }

    private function absolute(string $base, string $href): ?string
    {
        if (str_starts_with($href, '#') || str_starts_with($href, 'mailto:') || str_starts_with($href, 'tel:') || str_starts_with($href, 'javascript:')) {
            return null;
        }
        if (preg_match('#^https?://#i', $href) === 1) {
            return $href;
        }
        $scheme = parse_url($base, PHP_URL_SCHEME) ?: 'https';
        $host = parse_url($base, PHP_URL_HOST);
        if (! is_string($host)) {
            return null;
        }
        if (str_starts_with($href, '//')) {
            return "{$scheme}:{$href}";
        }

        return "{$scheme}://{$host}/".ltrim($href, '/');
    }
}

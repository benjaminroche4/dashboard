<?php

declare(strict_types=1);

namespace App\Actions\Properties;

use App\Data\ListingExtractionData;
use App\Services\Assistant;
use App\Services\ListingFetcher;
use RuntimeException;

/**
 * Lit une annonce (URL ou texte collé) avec l'assistant IA et en fait un
 * bien prêt à être relu dans le formulaire. Rien n'est enregistré ici.
 */
final readonly class ExtractListing
{
    private const string SYSTEM = <<<'TXT'
Tu es l'assistant d'une agence de relocation à Paris. On te donne le contenu d'une annonce immobilière (page web ou texte d'un agent), souvent en français, parfois en anglais.
Extrais les caractéristiques du logement pour l'annuaire des biens. Règles :
- N'invente rien : un champ inconnu vaut null. Le loyer est le loyer mensuel charges comprises si l'annonce le précise ainsi, sinon le loyer affiché ; les charges séparées vont dans « charges ».
- « property_type » : studio, t1 à t4 selon le nombre de pièces principales (T2 = 2 pièces), grand_appartement au-delà de 4 pièces, duplex, loft ou maison si l'annonce le dit.
- « furnished » : furnished si meublé, unfurnished si vide ou non meublé, null si non précisé.
- « lease_type » : alur (bail d'habitation classique 1 ou 3 ans), civil_code (bail code civil, résidence secondaire ou société), mobility (bail mobilité), airbnb (location courte durée), sinon null.
- « district » : arrondissement de Paris (1 à 20) si le bien est à Paris, déduit du code postal 750XX ou du texte (« 11e », « Oberkampf »…).
- « street » : numéro et rue si l'annonce les donne, sinon le quartier ou la rue seule, sinon chaîne vide.
- « notes » et « highlights » en français, factuels, sans superlatifs publicitaires.
TXT;

    public function __construct(
        private Assistant $assistant,
        private ListingFetcher $fetcher,
    ) {}

    /**
     * @return array{property: ListingExtractionData, source: 'url'|'text'}
     *
     * @throws RuntimeException si l'URL est injoignable ou si l'assistant échoue
     */
    public function handle(string $input): array
    {
        $input = trim($input);
        $url = self::url($input);
        $text = $input;

        if ($url !== null) {
            $text = $this->fetcher->fetch($url) ?? throw new RuntimeException("Impossible de lire cette page. Copiez-collez le texte de l'annonce à la place.");
        }

        $data = $this->assistant->extract(
            system: self::SYSTEM,
            prompt: "Annonce :\n\n".$text,
            schema: ListingExtractionData::schema(),
        );

        return [
            'property' => ListingExtractionData::from($data, $url),
            'source' => $url !== null ? 'url' : 'text',
        ];
    }

    /** L'entrée est une URL seule (http ou https), sinon null. */
    public static function url(string $input): ?string
    {
        if (preg_match('/^https?:\/\/\S+$/i', $input) !== 1) {
            return null;
        }

        return filter_var($input, FILTER_VALIDATE_URL) === false ? null : $input;
    }
}

<?php

declare(strict_types=1);

namespace App\Actions\Properties;

use App\Data\PropertyTransitData;
use App\Services\Assistant;
use Illuminate\Support\Facades\Cache;
use RuntimeException;

/**
 * Transports proches d'une adresse, proposés par l'assistant IA : stations de
 * métro, RER et tram, puis arrêts de bus, du plus proche au plus lointain.
 * Rien n'est enregistré ici : l'équipe relit avant d'enregistrer le bien.
 */
final readonly class FindNearbyTransit
{
    /** Une adresse ne change pas de quartier : la réponse se garde un mois. */
    private const int CACHE_DAYS = 30;

    private const string SYSTEM = <<<'TXT'
Tu es l'assistant d'une agence de relocation à Paris. On te donne l'adresse d'un logement.
Liste les transports en commun les plus proches, du plus proche au plus lointain, au maximum huit.
Règles :
- N'invente rien. Si tu ne connais pas le quartier avec certitude, renvoie une liste vide plutôt qu'une station approximative.
- Cite d'abord le métro, le RER et le tram, puis les arrêts de bus.
- « name » = le nom de la station ou de l'arrêt seul (« Oberkampf », et non « Métro Oberkampf »).
- « lines » = les lignes réellement desservies à cet arrêt (« 2 », « 9 », « A », « 96 »).
- « minutes » = temps de marche estimé depuis l'adresse ; null si tu ne peux pas l'estimer.
TXT;

    public function __construct(private Assistant $assistant) {}

    /**
     * @throws RuntimeException si l'assistant n'est pas configuré ou échoue
     */
    public function handle(string $address): PropertyTransitData
    {
        $address = trim(preg_replace('/\s+/', ' ', $address) ?? '');

        throw_if($address === '', RuntimeException::class, 'Renseignez l’adresse du bien avant de chercher les transports.');

        /** @var array<string, mixed> $data */
        $data = Cache::remember(
            'property-transit:'.hash('sha256', mb_strtolower($address)),
            now()->addDays(self::CACHE_DAYS),
            fn (): array => $this->assistant->extract(
                system: self::SYSTEM,
                prompt: "Adresse : {$address}",
                schema: PropertyTransitData::schema(),
            ),
        );

        return PropertyTransitData::from($data);
    }
}

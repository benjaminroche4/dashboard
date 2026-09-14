<?php

declare(strict_types=1);

namespace App\Actions\Clients;

use App\Models\Lead;
use App\Services\Assistant;
use Illuminate\Support\Facades\Cache;
use RuntimeException;

/**
 * Affine les agences suggérées pour un dossier avec l'assistant IA : il lit le
 * projet du client (texte libre, notes) et ce qu'on sait de chaque agence
 * (profil, notes, raisons du score), reclasse et explique chacune en une phrase.
 * Résultat en cache six heures pour un même dossier et une même liste.
 */
final readonly class ExplainClientAgentSuggestions
{
    public const array FITS = ['strong', 'good', 'weak'];

    private const string SYSTEM = <<<'TXT'
Tu es l'assistant d'une agence de relocation à Paris. On te donne le projet d'un client (ce qu'il a écrit, ses critères, les notes de l'équipe) et une liste d'agences immobilières partenaires présélectionnées par un score à points (territoire, segment, résultats passés, biens disponibles, relation).
Pour chaque agence, juge si c'est vraiment la bonne à contacter pour ce client : quartiers, gamme de loyers, meublé ou vide, langue, dossier étranger ou Garantme, expérience avec ce genre de profil, qualité de la relation, résultats passés. Règles :
- « fit » : strong = à contacter en premier, good = à contacter, weak = à garder en réserve.
- « reason » : une seule phrase en français, concrète, qui cite le critère décisif (positif ou négatif). On parle du client à la troisième personne.
- « ranking » : les clés des agences de la meilleure à la moins bonne. Ne juge que les agences fournies, toutes, sans en inventer.
TXT;

    public function __construct(private Assistant $assistant) {}

    /**
     * @param  list<array<string, mixed>>  $suggestions  Sorties de `SuggestClientAgents::summary()`
     * @return array{ranking: list<string>, explanations: array<string, array{fit: string, reason: string}>}
     *
     * @throws RuntimeException si l'assistant n'est pas configuré ou échoue
     */
    public function handle(Lead $lead, array $suggestions): array
    {
        if ($suggestions === []) {
            return ['ranking' => [], 'explanations' => []];
        }

        $keys = array_map(fn (array $suggestion): string => (string) $suggestion['key'], $suggestions);
        $key = 'client-agents:'.$lead->id.':'.md5(implode(',', $keys).'|'.$lead->updated_at?->timestamp);

        return Cache::remember($key, now()->addHours(6), fn (): array => $this->ask($lead, $suggestions, $keys));
    }

    /**
     * @param  list<array<string, mixed>>  $suggestions
     * @param  list<string>  $keys
     * @return array{ranking: list<string>, explanations: array<string, array{fit: string, reason: string}>}
     */
    private function ask(Lead $lead, array $suggestions, array $keys): array
    {
        $lead->loadMissing('notes');

        $client = array_filter([
            'Projet' => $lead->message,
            'Qualification' => $lead->qualification_note,
            'Langue' => $lead->language->label(),
            'Vient de' => $lead->origin_city,
            'Budget mensuel' => $lead->budget_cents === null ? null : number_format($lead->budget_cents / 100, 0, ',', ' ').' '.$lead->currency->value,
            'Arrondissements' => ($lead->districts ?? []) === [] ? null : implode(', ', $lead->districts ?? []),
            'Type de bien' => $lead->property_types?->map(fn ($type): string => $type->label())->implode(', ') ?: null,
            'Meublé' => $lead->furnished?->label(),
            'Durée' => $lead->duration?->label(),
            'Emménagement' => $lead->arrival_at?->toDateString(),
            'Garants' => $lead->guarantors?->map(fn ($type): string => $type->label())->implode(', ') ?: null,
            'Notes de l’équipe' => $lead->notes->sortByDesc('created_at')->take(10)->map(fn ($note): string => '- '.$note->body)->implode("\n") ?: null,
        ], fn (mixed $value): bool => $value !== null && $value !== '');

        $clientText = implode("\n", array_map(fn (string $label, string $value): string => "{$label} : {$value}", array_keys($client), $client));

        $agencyText = implode("\n\n", array_map(function (array $suggestion): string {
            $agency = $suggestion['agency'] ?? null;
            $best = $suggestion['best_agent'] ?? null;
            $lines = array_filter([
                'key' => (string) $suggestion['key'],
                'Agence' => $agency['name'] ?? 'Agent indépendant',
                'Ville' => trim(($agency['postal_code'] ?? '').' '.($agency['city'] ?? '')) ?: null,
                'Meilleur agent' => $best === null ? null : trim(($best['name'] ?? '').' · '.($best['position'] ?? '')),
                'Relation' => $best['relationship_quality_label'] ?? null,
                'Profil' => $suggestion['profile_text'] ?? null,
                'Score à points' => (string) ($suggestion['score'] ?? ''),
                'Raisons' => implode(', ', (array) ($suggestion['reasons'] ?? [])) ?: null,
                'Biens disponibles qui correspondent' => (string) ($suggestion['available_properties'] ?? 0),
                'Notes' => $suggestion['notes'] ?? null,
            ], fn (mixed $value): bool => $value !== null && $value !== '');

            return implode("\n", array_map(fn (string $label, string $value): string => "{$label} : {$value}", array_keys($lines), $lines));
        }, $suggestions));

        $data = $this->assistant->extract(
            system: self::SYSTEM,
            prompt: "Client :\n{$clientText}\n\nAgences :\n\n{$agencyText}",
            schema: self::schema($keys),
        );

        $explanations = [];
        foreach ((array) ($data['agencies'] ?? []) as $row) {
            $rowKey = (string) ($row['key'] ?? '');
            if (! in_array($rowKey, $keys, true)) {
                continue;
            }
            $fit = (string) ($row['fit'] ?? 'good');
            $explanations[$rowKey] = [
                'fit' => in_array($fit, self::FITS, true) ? $fit : 'good',
                'reason' => trim((string) ($row['reason'] ?? '')),
            ];
        }

        $ranking = array_values(array_unique(array_filter(array_map(strval(...), (array) ($data['ranking'] ?? [])), fn (string $k): bool => in_array($k, $keys, true))));
        foreach ($keys as $k) {
            if (! in_array($k, $ranking, true)) {
                $ranking[] = $k;
            }
        }

        return ['ranking' => $ranking, 'explanations' => $explanations];
    }

    /**
     * @param  list<string>  $keys
     * @return array<string, mixed>
     */
    public static function schema(array $keys): array
    {
        return [
            'type' => 'object',
            'additionalProperties' => false,
            'required' => ['agencies', 'ranking'],
            'properties' => [
                'agencies' => [
                    'type' => 'array',
                    'items' => [
                        'type' => 'object',
                        'additionalProperties' => false,
                        'required' => ['key', 'fit', 'reason'],
                        'properties' => [
                            'key' => ['type' => 'string', 'enum' => $keys],
                            'fit' => ['type' => 'string', 'enum' => self::FITS],
                            'reason' => ['type' => 'string'],
                        ],
                    ],
                ],
                'ranking' => ['type' => 'array', 'items' => ['type' => 'string', 'enum' => $keys]],
            ],
        ];
    }
}

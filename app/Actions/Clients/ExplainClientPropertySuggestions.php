<?php

declare(strict_types=1);

namespace App\Actions\Clients;

use App\Models\Lead;
use App\Models\Property;
use App\Services\Assistant;
use Illuminate\Support\Facades\Cache;
use RuntimeException;

/**
 * Affine les biens suggérés pour un dossier avec l'assistant IA : il lit le
 * texte libre du client (message, notes, qualification) et les notes de chaque
 * bien, classe les suggestions et explique chacune en une phrase. Résultat
 * mis en cache six heures pour un même dossier et une même liste de biens.
 */
final readonly class ExplainClientPropertySuggestions
{
    public const array FITS = ['strong', 'good', 'weak'];

    private const string SYSTEM = <<<'TXT'
Tu es l'assistant d'une agence de relocation à Paris. On te donne le projet d'un client (ce qu'il a écrit, les notes de l'équipe, ses critères) et une liste de logements présélectionnés par un score à points (budget, quartier, type, meublé).
Pour chaque logement, juge s'il correspond vraiment au client en tenant compte du texte libre (calme, lumineux, proche du métro, animaux, ascenseur, télétravail, famille, dates…) et des notes du bien. Règles :
- « fit » : strong = à proposer en priorité, good = à proposer, weak = à garder en réserve ou à écarter.
- « reason » : une seule phrase en français, concrète, qui cite le critère décisif (positif ou négatif). Vouvoiement inutile : on parle du client à la troisième personne.
- « ranking » : les identifiants des logements du meilleur au moins bon. Ne juge que les logements fournis, tous, sans en inventer.
TXT;

    public function __construct(private Assistant $assistant) {}

    /**
     * @param  list<array<string, mixed>>  $suggestions  Sorties de `SuggestClientProperties::summary()`
     * @return array{ranking: list<int>, explanations: array<int, array{fit: string, reason: string}>}
     *
     * @throws RuntimeException si l'assistant n'est pas configuré ou échoue
     */
    public function handle(Lead $lead, array $suggestions): array
    {
        if ($suggestions === []) {
            return ['ranking' => [], 'explanations' => []];
        }

        $ids = array_map(fn (array $suggestion): int => (int) $suggestion['id'], $suggestions);
        $key = 'client-suggestions:'.$lead->id.':'.md5(implode(',', $ids).'|'.$lead->updated_at?->timestamp);

        return Cache::remember($key, now()->addHours(6), fn (): array => $this->ask($lead, $suggestions, $ids));
    }

    /**
     * @param  list<array<string, mixed>>  $suggestions
     * @param  list<int>  $ids
     * @return array{ranking: list<int>, explanations: array<int, array{fit: string, reason: string}>}
     */
    private function ask(Lead $lead, array $suggestions, array $ids): array
    {
        $lead->loadMissing('notes');
        $properties = Property::query()->whereKey($ids)->get()->keyBy('id');

        $client = array_filter([
            'Projet' => $lead->message,
            'Qualification' => $lead->qualification_note,
            'Budget mensuel' => $lead->budget_cents === null ? null : number_format($lead->budget_cents / 100, 0, ',', ' ').' '.$lead->currency->value,
            'Arrondissements' => ($lead->districts ?? []) === [] ? null : implode(', ', $lead->districts ?? []),
            'Type de bien' => $lead->property_types?->map(fn ($type): string => $type->label())->implode(', ') ?: null,
            'Meublé' => $lead->furnished?->label(),
            'Durée' => $lead->duration?->label(),
            'Emménagement' => $lead->arrival_at?->toDateString(),
            'Foyer' => $lead->guarantors?->map(fn ($type): string => $type->label())->implode(', ') ?: null,
            'Notes de l’équipe' => $lead->notes->sortByDesc('created_at')->take(10)->map(fn ($note): string => '- '.$note->body)->implode("\n") ?: null,
        ], fn (mixed $value): bool => $value !== null && $value !== '');

        $clientText = implode("\n", array_map(fn (string $label, string $value): string => "{$label} : {$value}", array_keys($client), $client));

        $propertyText = implode("\n\n", array_map(function (array $suggestion) use ($properties): string {
            $property = $properties->get((int) $suggestion['id']);
            $lines = array_filter([
                'id' => (string) $suggestion['id'],
                'Bien' => $suggestion['label'],
                'Adresse' => trim(implode(', ', array_filter([$suggestion['street'], trim(($suggestion['postal_code'] ?? '').' '.($suggestion['city'] ?? ''))]))),
                'Type' => $suggestion['property_type_label'] ?? null,
                'Meublé' => $suggestion['furnished_label'] ?? null,
                'Surface' => isset($suggestion['surface_m2']) ? $suggestion['surface_m2'].' m²' : null,
                'Loyer' => isset($suggestion['rent_cents']) ? number_format($suggestion['rent_cents'] / 100, 0, ',', ' ').' '.$suggestion['currency'].' / mois' : null,
                'Étage' => $property?->floor?->label(),
                'Pièces' => $property?->rooms === null ? null : (string) $property->rooms,
                'Score à points' => (string) ($suggestion['score'] ?? ''),
                'Critères remplis' => implode(', ', (array) ($suggestion['reasons'] ?? [])) ?: null,
                'Notes' => $property?->notes,
            ], fn (mixed $value): bool => $value !== null && $value !== '');

            return implode("\n", array_map(fn (string $label, string $value): string => "{$label} : {$value}", array_keys($lines), $lines));
        }, $suggestions));

        $data = $this->assistant->extract(
            system: self::SYSTEM,
            prompt: "Client :\n{$clientText}\n\nLogements :\n\n{$propertyText}",
            schema: $this->schema($ids),
        );

        $explanations = [];
        foreach ((array) ($data['properties'] ?? []) as $row) {
            $id = (int) ($row['id'] ?? 0);
            if (! in_array($id, $ids, true)) {
                continue;
            }
            $fit = (string) ($row['fit'] ?? 'good');
            $explanations[$id] = [
                'fit' => in_array($fit, self::FITS, true) ? $fit : 'good',
                'reason' => trim((string) ($row['reason'] ?? '')),
            ];
        }

        $ranking = array_values(array_unique(array_filter(array_map(intval(...), (array) ($data['ranking'] ?? [])), fn (int $id): bool => in_array($id, $ids, true))));
        // Les biens oubliés par l'assistant restent en queue, dans l'ordre initial.
        foreach ($ids as $id) {
            if (! in_array($id, $ranking, true)) {
                $ranking[] = $id;
            }
        }

        return ['ranking' => $ranking, 'explanations' => $explanations];
    }

    /**
     * @param  list<int>  $ids
     * @return array<string, mixed>
     */
    private function schema(array $ids): array
    {
        return [
            'type' => 'object',
            'additionalProperties' => false,
            'required' => ['properties', 'ranking'],
            'properties' => [
                'properties' => [
                    'type' => 'array',
                    'items' => [
                        'type' => 'object',
                        'additionalProperties' => false,
                        'required' => ['id', 'fit', 'reason'],
                        'properties' => [
                            'id' => ['type' => 'integer', 'enum' => $ids],
                            'fit' => ['type' => 'string', 'enum' => self::FITS],
                            'reason' => ['type' => 'string'],
                        ],
                    ],
                ],
                'ranking' => ['type' => 'array', 'items' => ['type' => 'integer', 'enum' => $ids]],
            ],
        ];
    }
}

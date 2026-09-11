<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\TransitKind;

/**
 * Transports proches d'un bien : métro, RER, tram et bus, dans l'ordre où on
 * les annonce à un client. C'est une **proposition** de l'assistant, relue par
 * l'équipe avant d'être enregistrée sur le bien.
 */
final readonly class PropertyTransitData
{
    /** Au-delà, la liste n'aide plus personne. */
    public const int MAX_STOPS = 8;

    /**
     * @param  list<TransitStopData>  $stops
     */
    public function __construct(public array $stops) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public static function from(array $data): self
    {
        $stops = array_values(array_filter(array_map(
            fn (mixed $stop): ?TransitStopData => is_array($stop) ? TransitStopData::from($stop) : null,
            is_array($data['stops'] ?? null) ? $data['stops'] : [],
        )));

        return new self(array_slice($stops, 0, self::MAX_STOPS));
    }

    /**
     * @return array{stops: list<array{kind: string, name: string, lines: list<string>, minutes: int|null}>}
     */
    public function toArray(): array
    {
        return ['stops' => array_map(fn (TransitStopData $stop): array => $stop->toArray(), $this->stops)];
    }

    public function isEmpty(): bool
    {
        return $this->stops === [];
    }

    /**
     * Schéma JSON demandé à l'assistant (sorties structurées).
     *
     * @return array<string, mixed>
     */
    public static function schema(): array
    {
        return [
            'type' => 'object',
            'additionalProperties' => false,
            'required' => ['stops'],
            'properties' => [
                'stops' => [
                    'type' => 'array',
                    'items' => [
                        'type' => 'object',
                        'additionalProperties' => false,
                        'required' => ['kind', 'name', 'lines', 'minutes'],
                        'properties' => [
                            'kind' => ['type' => 'string', 'enum' => array_map(fn (TransitKind $kind): string => $kind->value, TransitKind::cases())],
                            'name' => ['type' => 'string', 'description' => 'Nom de la station ou de l’arrêt, sans le mot « métro » ni « bus »'],
                            'lines' => ['type' => 'array', 'items' => ['type' => 'string'], 'description' => 'Numéros ou lettres des lignes (six au maximum), ex. « 2 », « 9 », « A », « 96 »'],
                            'minutes' => ['type' => ['integer', 'null'], 'description' => 'Temps de marche estimé en minutes, null si incertain'],
                        ],
                    ],
                ],
            ],
        ];
    }
}

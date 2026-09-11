<?php

declare(strict_types=1);

namespace App\Support;

use BackedEnum;

/**
 * Fragments de JSON Schema pour les sorties structurées de l'assistant.
 *
 * L'API impose deux règles que ces helpers encodent une fois pour toutes :
 * - `minimum` / `maximum` ne sont pas acceptés sur un entier ; la borne se dit
 *   dans la description et se vérifie à la relecture du DTO ;
 * - un `enum` ne peut pas cohabiter avec un type union `['string', 'null']` ;
 *   un champ facultatif à valeurs fermées passe par `anyOf`.
 */
final class JsonSchema
{
    /**
     * Champ facultatif d'un type simple : `['string', 'null']`.
     *
     * @param  array<string, mixed>  $extra
     * @return array<string, mixed>
     */
    public static function nullable(string $type, array $extra = []): array
    {
        return ['type' => [$type, 'null'], ...$extra];
    }

    /**
     * Champ à valeurs fermées, facultatif : `anyOf` plutôt qu'un type union,
     * que l'API refuse dès qu'un `enum` est présent.
     *
     * @param  list<string>  $values
     * @return array<string, mixed>
     */
    public static function nullableEnum(array $values, ?string $description = null): array
    {
        return [
            'anyOf' => [['type' => 'string', 'enum' => $values], ['type' => 'null']],
            ...($description === null ? [] : ['description' => $description]),
        ];
    }

    /**
     * Valeurs d'un enum PHP, telles qu'attendues dans le schéma.
     *
     * @param  class-string<BackedEnum>  $enum
     * @return list<string>
     */
    public static function values(string $enum): array
    {
        return array_map(fn (BackedEnum $case): string => (string) $case->value, $enum::cases());
    }
}

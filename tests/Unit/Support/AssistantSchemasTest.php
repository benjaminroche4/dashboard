<?php

declare(strict_types=1);

use App\Actions\Clients\ExplainClientPropertySuggestions;
use App\Data\LeadQualificationData;
use App\Data\ListingExtractionData;
use App\Data\PropertyTransitData;
use App\Support\JsonSchema;
use Tests\TestCase;

uses(TestCase::class);

/**
 * Mots-clés que les sorties structurées de l'API refusent : un schéma qui en
 * contient part en 400 « invalid_request_error ».
 *
 * @return list<string> chemins fautifs
 */
function motsCleInterdits(mixed $schema, string $chemin = ''): array
{
    if (! is_array($schema)) {
        return [];
    }

    $fautes = [];

    foreach (['minimum', 'maximum', 'minItems', 'maxItems', 'minLength', 'maxLength', 'pattern', 'format'] as $mot) {
        if (array_key_exists($mot, $schema)) {
            $fautes[] = trim($chemin.'.'.$mot, '.');
        }
    }

    // Un `enum` ne cohabite pas avec un type union : il faut passer par `anyOf`.
    if (isset($schema['enum']) && is_array($schema['type'] ?? null)) {
        $fautes[] = trim($chemin.'.enum sur un type union', '.');
    }

    foreach ($schema as $cle => $valeur) {
        $fautes = [...$fautes, ...motsCleInterdits($valeur, trim($chemin.'.'.$cle, '.'))];
    }

    return $fautes;
}

test('the schemas sent to the assistant use only what the API accepts', function (): void {
    $schemas = [
        'qualification d’un lead' => LeadQualificationData::schema(),
        'import d’annonce' => ListingExtractionData::schema(),
        'transports d’un bien' => PropertyTransitData::schema(),
        'matching bien ↔ client' => (new ReflectionMethod(ExplainClientPropertySuggestions::class, 'schema'))
            ->invoke(resolve(ExplainClientPropertySuggestions::class), [1, 2]),
    ];

    foreach ($schemas as $nom => $schema) {
        expect(motsCleInterdits($schema))->toBe([], "Schéma « {$nom} » : mot-clé refusé par l'API.");
    }
});

test('a closed list that may be empty goes through anyOf, never through a union type', function (): void {
    $champ = JsonSchema::nullableEnum(['fr', 'en'], 'Langue du lead');

    expect($champ)->toBe([
        'anyOf' => [['type' => 'string', 'enum' => ['fr', 'en']], ['type' => 'null']],
        'description' => 'Langue du lead',
    ]);

    // Le champ facultatif d'un type simple, lui, garde le type union.
    expect(JsonSchema::nullable('integer', ['description' => 'Étage']))
        ->toBe(['type' => ['integer', 'null'], 'description' => 'Étage']);
});

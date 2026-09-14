<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\AgencySpecialty;
use App\Enums\MandateType;
use App\Enums\SpokenLanguage;
use App\Support\JsonSchema;

/**
 * Ce que l'assistant a lu du site d'une agence (et de sa fiche Google) :
 * une proposition de profil, relue par l'équipe avant d'être appliquée.
 */
final readonly class AgencyEnrichmentData
{
    public const array FIELDS = ['districts', 'specialties', 'languages', 'mandate_types', 'fee_note', 'rent_min_cents', 'rent_max_cents', 'accepts_garantme', 'accepts_foreign_files'];

    /**
     * @return array<string, mixed>
     */
    public static function schema(): array
    {
        return [
            'type' => 'object',
            'additionalProperties' => false,
            'required' => ['summary', 'districts', 'specialties', 'languages', 'mandate_types', 'fee_note', 'rent_min_eur', 'rent_max_eur', 'accepts_garantme', 'accepts_foreign_files', 'notes'],
            'properties' => [
                'summary' => ['type' => 'string', 'description' => 'L’agence en une ou deux phrases : ce qu’elle fait, pour qui.'],
                'districts' => ['type' => 'array', 'items' => ['type' => 'integer'], 'description' => 'Arrondissements de Paris (1 à 20) que l’agence dit couvrir. Vide si rien de précis.'],
                'specialties' => ['type' => 'array', 'items' => ['type' => 'string', 'enum' => JsonSchema::values(AgencySpecialty::class)], 'description' => 'Seulement ce que le texte affirme.'],
                'languages' => ['type' => 'array', 'items' => ['type' => 'string', 'enum' => JsonSchema::values(SpokenLanguage::class)], 'description' => 'Langues parlées hors français, seulement si annoncées.'],
                'mandate_types' => ['type' => 'array', 'items' => ['type' => 'string', 'enum' => JsonSchema::values(MandateType::class)]],
                'fee_note' => JsonSchema::nullable('string', ['description' => 'Frais d’agence pour le locataire, tels qu’annoncés (ex. « 12 €/m² » ou « un mois de loyer »). Null si non indiqués.']),
                'rent_min_eur' => JsonSchema::nullable('integer', ['description' => 'Loyer mensuel le plus bas des annonces en euros, null si aucune annonce lue.']),
                'rent_max_eur' => JsonSchema::nullable('integer', ['description' => 'Loyer mensuel le plus haut des annonces en euros, null si aucune annonce lue.']),
                'accepts_garantme' => JsonSchema::nullable('boolean', ['description' => 'Vrai si l’agence mentionne accepter Garantme ou une garantie locative équivalente ; null si rien n’est dit.']),
                'accepts_foreign_files' => JsonSchema::nullable('boolean', ['description' => 'Vrai si l’agence s’adresse explicitement aux étrangers ou expatriés ; null si rien n’est dit.']),
                'notes' => ['type' => 'string', 'description' => 'Ce qui mérite d’être su pour travailler avec elle (horaires, process, exigences de dossier). Vide si rien.'],
            ],
        ];
    }

    /**
     * Normalise la réponse du modèle en proposition de profil : enums vérifiés,
     * loyers en centimes, arrondissements bornés.
     *
     * @param  array<string, mixed>  $raw
     * @return array<string, mixed>
     */
    public static function from(array $raw): array
    {
        $profile = AgencyProfileData::from([
            'districts' => $raw['districts'] ?? [],
            'specialties' => $raw['specialties'] ?? [],
            'languages' => $raw['languages'] ?? [],
            'mandate_types' => $raw['mandate_types'] ?? [],
            'fee_note' => $raw['fee_note'] ?? null,
            'rent_min_cents' => isset($raw['rent_min_eur']) && is_numeric($raw['rent_min_eur']) ? (int) round((float) $raw['rent_min_eur'] * 100) : null,
            'rent_max_cents' => isset($raw['rent_max_eur']) && is_numeric($raw['rent_max_eur']) ? (int) round((float) $raw['rent_max_eur'] * 100) : null,
            'accepts_garantme' => $raw['accepts_garantme'] ?? null,
            'accepts_foreign_files' => $raw['accepts_foreign_files'] ?? null,
        ]);

        return [
            'summary' => trim((string) ($raw['summary'] ?? '')),
            'notes' => trim((string) ($raw['notes'] ?? '')),
            ...array_map(
                fn (mixed $value): mixed => is_array($value) ? array_map(fn (mixed $v): mixed => $v instanceof \BackedEnum ? $v->value : $v, $value) : $value,
                $profile->toArray(),
            ),
        ];
    }
}

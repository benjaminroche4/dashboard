<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\DossierSection;
use App\Support\JsonSchema;

/**
 * Ce que l'assistant a rédigé pour le dossier fusionné : la **page de garde**
 * (présentation du foyer et chiffres clés) et une **fiche récapitulative par
 * partie** (salaires, impôts, épargne…), chacune relevant les faits lus dans
 * les pièces de la partie. Stockée sur la liste avec l'empreinte des pièces
 * dont elle est tirée : si une pièce change, la synthèse est périmée.
 *
 * @phpstan-type Fact array{label: string, value: string}
 * @phpstan-type SectionBrief array{key: string, person_index: int, person: string, role: string, section: string, label: string, title: string, summary: string|null, facts: list<Fact>, documents: list<array{label: string, note: string|null}>, caveats: list<string>}
 * @phpstan-type Figure array{value: string|null, detail: string|null, breakdown: list<Fact>}
 * @phpstan-type Figures array{salary: Figure, taxes: Figure, savings: Figure}
 * @phpstan-type Cover array{summary: string, figures: Figures, highlights: list<string>, caveats: list<string>}
 */
final readonly class DossierBriefData
{
    /** Longueur maximale d'un résumé, imprimé sur une page A4 avec le reste. */
    public const int SUMMARY_LENGTH = 2_500;

    /** Les trois cartes de la page de garde, dans l'ordre : salaires, imposition, épargne. */
    public const array FIGURES = ['salary', 'taxes', 'savings'];


    /**
     * @param  Cover  $cover
     * @param  list<SectionBrief>  $sections
     */
    public function __construct(
        public array $cover,
        public array $sections,
    ) {}

    /**
     * Schéma de la fiche d'une partie : titre, résumé, faits chiffrés,
     * une note par pièce et les réserves. Bornes dans les descriptions.
     *
     * @return array<string, mixed>
     */
    public static function sectionSchema(): array
    {
        return [
            'type' => 'object',
            'additionalProperties' => false,
            'required' => ['title', 'summary', 'facts', 'documents', 'caveats'],
            'properties' => [
                'title' => ['type' => 'string', 'description' => 'Titre court de la fiche, en français (« Revenus : 4 150 € nets par mois en moyenne »).'],
                'summary' => ['type' => 'string', 'description' => 'Deux à quatre phrases qui disent ce que les pièces établissent, avec les chiffres clés ; rien qui ne soit lu sur les pièces.'],
                'facts' => [
                    'type' => 'array',
                    'description' => 'Trois à huit faits chiffrés ou datés lus sur les pièces (libellé court, valeur courte).',
                    'items' => [
                        'type' => 'object',
                        'additionalProperties' => false,
                        'required' => ['label', 'value'],
                        'properties' => [
                            'label' => ['type' => 'string'],
                            'value' => ['type' => 'string'],
                        ],
                    ],
                ],
                'documents' => [
                    'type' => 'array',
                    'description' => 'Une entrée par fichier joint, dans l’ordre donné : ce qu’il est réellement et son chiffre ou sa date clé, en une ligne.',
                    'items' => [
                        'type' => 'object',
                        'additionalProperties' => false,
                        'required' => ['label', 'note'],
                        'properties' => [
                            'label' => ['type' => 'string', 'description' => 'Nom du fichier tel qu’il a été donné.'],
                            'note' => ['type' => 'string'],
                        ],
                    ],
                ],
                'caveats' => [
                    'type' => 'array',
                    'description' => 'Points d’attention pour le lecteur (incohérence, période non couverte, document proche de l’expiration). Vide s’il n’y en a pas.',
                    'items' => ['type' => 'string'],
                ],
            ],
        ];
    }

    /**
     * Schéma de la page de garde : la présentation qui vend le dossier à un
     * bailleur (honnête, chiffrée) et ses points forts, rédigés d'après les
     * fiches des parties et le projet.
     *
     * @return array<string, mixed>
     */
    public static function coverSchema(): array
    {
        return [
            'type' => 'object',
            'additionalProperties' => false,
            'required' => ['summary', 'figures', 'highlights', 'caveats'],
            'properties' => [
                'figures' => [
                    'type' => 'object',
                    'additionalProperties' => false,
                    'description' => 'Les trois cartes qui ouvrent la page de garde. Une valeur que les pièces ne donnent pas reste null, jamais devinée.',
                    'required' => self::FIGURES,
                    'properties' => [
                        'salary' => self::figureSchema('Salaires du foyer : en valeur le total des revenus nets mensuels des locataires (« 7 300 € nets / mois »), en détail la nature et la période (« CDI, moyenne de juin à août 2026 »), et en répartition une ligne par locataire quand il y en a deux (« Léa Durand » : « 4 150 € »). Un seul locataire : répartition vide.'),
                        'taxes' => self::figureSchema('Imposition : en valeur le revenu fiscal de référence du dernier avis (la somme des avis du foyer s’il y en a deux), en détail l’année et le nombre de parts, en répartition une ligne par personne quand il y en a deux.'),
                        'savings' => self::figureSchema('Épargne : en valeur le total de l’épargne disponible lue sur les relevés (livrets, comptes titres, assurance-vie, solde créditeur), en détail les supports et la date, en répartition une ligne par personne ou par support quand il y en a plusieurs.'),
                    ],
                ],
                'summary' => ['type' => 'string', 'description' => 'La présentation du dossier : trois ou quatre paragraphes séparés par une ligne vide, de l’atout le plus fort à la disponibilité du foyer, chaque affirmation appuyée sur un fait ou un chiffre. Entre 800 et 1 500 caractères.'],
                'highlights' => [
                    'type' => 'array',
                    'description' => 'Points forts du dossier : trois à six lignes courtes et concrètes, chacune avec son chiffre ou son fait (« Revenus du foyer : 7 300 € nets par mois, soit 3,4 fois le loyer », « CDI depuis 2021 chez Nestlé, hors période d’essai »).',
                    'items' => ['type' => 'string'],
                ],
                'caveats' => [
                    'type' => 'array',
                    'description' => 'Réserves à connaître avant de présenter le dossier. Vide s’il n’y en a pas.',
                    'items' => ['type' => 'string'],
                ],
            ],
        ];
    }

    /**
     * Schéma d'une carte : une valeur courte, un détail d'une ligne, une répartition.
     *
     * @return array<string, mixed>
     */
    private static function figureSchema(string $description): array
    {
        return [
            'type' => 'object',
            'additionalProperties' => false,
            'description' => $description,
            'required' => ['value', 'detail', 'breakdown'],
            'properties' => [
                'value' => JsonSchema::nullable('string', ['description' => 'Valeur courte, avec son unité.']),
                'detail' => JsonSchema::nullable('string', ['description' => 'Une ligne de contexte.']),
                'breakdown' => [
                    'type' => 'array',
                    'items' => [
                        'type' => 'object',
                        'additionalProperties' => false,
                        'required' => ['label', 'value'],
                        'properties' => [
                            'label' => ['type' => 'string'],
                            'value' => ['type' => 'string'],
                        ],
                    ],
                ],
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public static function from(array $data): self
    {
        $cover = is_array($data['cover'] ?? null) ? $data['cover'] : [];
        $sections = is_array($data['sections'] ?? null) ? $data['sections'] : [];

        return new self(
            cover: [
                'summary' => mb_substr(self::text($cover['summary'] ?? null) ?? '', 0, self::SUMMARY_LENGTH),
                'figures' => self::figures($cover['figures'] ?? null),
                'highlights' => self::lines($cover['highlights'] ?? null),
                'caveats' => self::lines($cover['caveats'] ?? null),
            ],
            sections: array_values(array_filter(array_map(self::storedSection(...), $sections))),
        );
    }

    /**
     * Fiche d'une partie telle que renvoyée par l'assistant, remise en forme
     * avec ce que le plan sait de la partie (personne, thème, fichiers).
     *
     * @param  array<string, mixed>  $reply  réponse de l'assistant, vide si la partie n'a pas été lue
     * @param  array{key: string, person_index: int, person: string, role: string, section: DossierSection}  $plan
     * @param  list<string>  $files  noms des fichiers de la partie, dans l'ordre
     * @return SectionBrief
     */
    public static function sectionFrom(array $reply, array $plan, array $files): array
    {
        $notes = [];

        foreach (is_array($reply['documents'] ?? null) ? $reply['documents'] : [] as $document) {
            if (is_array($document) && isset($document['label'])) {
                $notes[(string) $document['label']] = self::text($document['note'] ?? null);
            }
        }

        return [
            'key' => $plan['key'],
            'person_index' => $plan['person_index'],
            'person' => $plan['person'],
            'role' => $plan['role'],
            'section' => $plan['section']->value,
            'label' => $plan['section']->label(),
            'title' => self::text($reply['title'] ?? null) ?? $plan['section']->label(),
            'summary' => $reply === [] ? null : self::text(mb_substr(self::text($reply['summary'] ?? null) ?? '', 0, self::SUMMARY_LENGTH)),
            'facts' => self::facts($reply['facts'] ?? null),
            // Une note par fichier **du plan**, jamais un fichier inventé.
            'documents' => array_map(fn (string $file): array => ['label' => $file, 'note' => $notes[$file] ?? null], $files),
            'caveats' => self::lines($reply['caveats'] ?? null),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return ['cover' => $this->cover, 'sections' => $this->sections];
    }

    /**
     * @return SectionBrief|null
     */
    public function section(string $key): ?array
    {
        foreach ($this->sections as $section) {
            if ($section['key'] === $key) {
                return $section;
            }
        }

        return null;
    }

    /**
     * Fiche relue depuis la base : mêmes garde-fous qu'à la réception.
     *
     * @return SectionBrief|null
     */
    private static function storedSection(mixed $section): ?array
    {
        if (! is_array($section) || ! isset($section['key'], $section['section'])) {
            return null;
        }

        $theme = DossierSection::tryFrom((string) $section['section']);

        if (! $theme instanceof DossierSection) {
            return null;
        }

        return self::sectionFrom(
            array_filter([
                'title' => $section['title'] ?? null,
                'summary' => $section['summary'] ?? null,
                'facts' => $section['facts'] ?? null,
                'documents' => $section['documents'] ?? null,
                'caveats' => $section['caveats'] ?? null,
            ], fn (mixed $value): bool => $value !== null),
            [
                'key' => (string) $section['key'],
                'person_index' => (int) ($section['person_index'] ?? 0),
                'person' => (string) ($section['person'] ?? ''),
                'role' => (string) ($section['role'] ?? ''),
                'section' => $theme,
            ],
            array_values(array_map(fn (mixed $document): string => (string) (is_array($document) ? ($document['label'] ?? '') : ''), is_array($section['documents'] ?? null) ? $section['documents'] : [])),
        );
    }

    /**
     * Les trois cartes, toujours présentes : une carte absente est vide (« Non renseigné » à l'affichage).
     *
     * @return Figures
     */
    private static function figures(mixed $value): array
    {
        $figures = [];

        foreach (self::FIGURES as $key) {
            $figure = is_array($value) && is_array($value[$key] ?? null) ? $value[$key] : [];
            $figures[$key] = [
                'value' => self::text($figure['value'] ?? null),
                'detail' => self::text($figure['detail'] ?? null),
                'breakdown' => self::facts($figure['breakdown'] ?? null),
            ];
        }

        /** @var Figures $figures */
        return $figures;
    }

    /**
     * Couples libellé / valeur, les deux non vides.
     *
     * @return list<Fact>
     */
    private static function facts(mixed $value): array
    {
        if (! is_array($value)) {
            return [];
        }

        return array_values(array_filter(array_map(
            fn (mixed $fact): ?array => is_array($fact) && self::text($fact['label'] ?? null) !== null && self::text($fact['value'] ?? null) !== null
                ? ['label' => (string) $fact['label'], 'value' => (string) $fact['value']]
                : null,
            $value,
        )));
    }

    /**
     * @return list<string>
     */
    private static function lines(mixed $value): array
    {
        if (! is_array($value)) {
            return [];
        }

        return array_values(array_filter(array_map(fn (mixed $line): ?string => is_scalar($line) ? self::text($line) : null, $value)));
    }

    private static function text(mixed $value): ?string
    {
        $text = trim((string) ($value ?? ''));

        return $text === '' ? null : $text;
    }
}

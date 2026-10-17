<?php

declare(strict_types=1);

namespace App\Support;

use App\Actions\Documents\RenderDocumentRequestPdf;
use App\Enums\DocumentUploadStatus;
use App\Enums\DossierSection;
use App\Enums\HouseholdRole;
use App\Models\DocumentRequest;
use App\Models\DocumentUpload;
use Illuminate\Support\Collection;

/**
 * L'ordre du dossier fusionné, **une seule fois** : les locataires d'abord,
 * puis les garants ; pour chaque personne les parties du dossier
 * (`DossierSection`) dans leur ordre ; dans une partie les pièces dans l'ordre
 * du catalogue ; pour une pièce ses fichiers dans l'ordre de dépôt. Seuls les
 * fichiers **validés** par l'équipe en font partie.
 *
 * Le PDF fusionné (`resources/js/lib/document-dossier.ts`), l'archive zip, la
 * page de garde et les fiches récapitulatives lisent tous ce plan.
 *
 * @phpstan-type PlanDocument array{key: string, label: string, uploads: list<DocumentUpload>}
 * @phpstan-type PlanSection array{key: string, person_index: int, person: string, role: string, section: DossierSection, documents: list<PlanDocument>}
 */
final class DossierPlan
{
    /**
     * Parties du dossier qui ont **au moins un fichier validé**, dans l'ordre.
     *
     * @return list<PlanSection>
     */
    public static function sections(DocumentRequest $request): array
    {
        $persons = RenderDocumentRequestPdf::persons($request);
        $sections = [];

        foreach (self::personOrder($request) as $index) {
            $person = $persons[$index] ?? null;

            if ($person === null) {
                continue;
            }

            /** @var array<string, list<PlanDocument>> $byTheme */
            $byTheme = [];

            foreach ($person['categories'] as $category) {
                foreach ($category['documents'] as $document) {
                    $uploads = self::accepted($request, $index, $document['key']);

                    if ($uploads === []) {
                        continue;
                    }

                    $byTheme[$document['section']][] = ['key' => $document['key'], 'label' => $document['label'], 'uploads' => $uploads];
                }
            }

            foreach (DossierSection::cases() as $theme) {
                if (! isset($byTheme[$theme->value])) {
                    continue;
                }

                $sections[] = [
                    'key' => self::key($index, $theme),
                    'person_index' => $index,
                    'person' => $person['name'],
                    'role' => $person['role'],
                    'section' => $theme,
                    'documents' => $byTheme[$theme->value],
                ];
            }
        }

        return $sections;
    }

    /**
     * Une partie du plan, retrouvée par sa clé (« 0-income »).
     *
     * @return PlanSection|null
     */
    public static function section(DocumentRequest $request, string $key): ?array
    {
        foreach (self::sections($request) as $section) {
            if ($section['key'] === $key) {
                return $section;
            }
        }

        return null;
    }

    /** Clé d'une partie : l'index de la personne et le thème, lisible dans une URL. */
    public static function key(int $personIndex, DossierSection $section): string
    {
        return "{$personIndex}-{$section->value}";
    }

    /**
     * Index des personnes dans l'ordre du dossier : locataires puis garants,
     * chacun gardant sa place dans le foyer.
     *
     * @return list<int>
     */
    public static function personOrder(DocumentRequest $request): array
    {
        $order = [];

        foreach ([HouseholdRole::Tenant, HouseholdRole::Guarantor] as $role) {
            foreach ($request->persons as $index => $person) {
                if ($person['role'] === $role->value) {
                    $order[] = $index;
                }
            }
        }

        return $order;
    }

    /**
     * Vrai quand **chaque pièce demandée** à chaque personne a au moins un
     * fichier validé : le dossier est complet, il peut partir.
     */
    public static function isComplete(DocumentRequest $request): bool
    {
        return self::missingCount($request) === 0 && $request->documentCount() > 0;
    }

    /** Pièces demandées sans aucun fichier validé. */
    public static function missingCount(DocumentRequest $request): int
    {
        return count(self::missingLabels($request));
    }

    /**
     * Les pièces encore attendues, nommées : « Léa Durand (Locataire) : RIB ».
     * La synthèse les dit au lecteur plutôt que de passer pour complète.
     *
     * @return list<string>
     */
    public static function missingLabels(DocumentRequest $request): array
    {
        $labels = [];

        foreach ($request->persons as $index => $person) {
            $who = trim(($person['first_name'] ?? '').' '.($person['last_name'] ?? '')) ?: 'Personne '.($index + 1);
            $role = HouseholdRole::tryFrom($person['role'])?->label() ?? '';

            foreach ($person['documents'] as $key) {
                if (self::accepted($request, $index, $key) === []) {
                    $labels[] = sprintf('%s%s : %s', $who, $role === '' ? '' : " ({$role})", DocumentCatalog::label($key));
                }
            }
        }

        return $labels;
    }

    /**
     * Au moins un fichier validé : la synthèse a de quoi lire. Elle n'attend
     * pas que le dossier soit complet, elle dit ce qui manque.
     */
    public static function hasValidFiles(DocumentRequest $request): bool
    {
        return self::valid($request)->isNotEmpty();
    }

    /**
     * Empreinte d'une seule partie : ses fichiers validés. Une fiche dont la
     * partie n'a pas bougé est gardée telle quelle à la mise à jour.
     *
     * @param  array{documents: list<PlanDocument>}  $plan
     */
    public static function sectionFingerprint(array $plan): string
    {
        $ids = [];

        foreach ($plan['documents'] as $document) {
            foreach ($document['uploads'] as $upload) {
                $ids[] = $upload->id;
            }
        }

        sort($ids);

        return hash('sha256', implode(',', $ids));
    }

    /**
     * Empreinte des fichiers validés : une pièce validée, retirée ou remise en
     * vérification la change, et une synthèse calculée sur l'ancien jeu de
     * pièces est alors périmée.
     */
    public static function fingerprint(DocumentRequest $request): string
    {
        $ids = self::valid($request)->pluck('id')->sort()->values()->all();

        return hash('sha256', implode(',', $ids));
    }

    /**
     * @return Collection<int, DocumentUpload>
     */
    public static function valid(DocumentRequest $request): Collection
    {
        return $request->uploads->where('status', DocumentUploadStatus::Accepted);
    }

    /**
     * @return list<DocumentUpload>
     */
    private static function accepted(DocumentRequest $request, int $personIndex, string $key): array
    {
        return array_values(self::valid($request)
            ->where('person_index', $personIndex)
            ->where('document_key', $key)
            ->sortBy([['created_at', 'asc'], ['id', 'asc']])
            ->all());
    }
}

/**
 * Parties du dossier fusionné, **dans l'ordre où une agence le lit** : miroir
 * de `App\Enums\DossierSection` (contrôlé par `tests/Unit/Enums/DossierSectionMirrorTest.php`).
 * Chaque pièce sérialisée porte sa `section` ; le plan du dossier et la fusion
 * s'ordonnent avec ce tableau.
 */
export const dossierSections = [
    { value: 'identity', label: 'Identité et séjour' },
    { value: 'employment', label: 'Situation professionnelle' },
    { value: 'income', label: 'Revenus et salaires' },
    { value: 'taxes', label: 'Impôts' },
    { value: 'savings', label: 'Épargne et banque' },
    { value: 'aid', label: 'Aides et prises en charge' },
    { value: 'guarantee', label: 'Garanties' },
    { value: 'housing', label: 'Logement actuel' },
    { value: 'studies', label: 'Études' },
    { value: 'other', label: 'Autres pièces' },
] as const;

export type DossierSectionValue = (typeof dossierSections)[number]['value'];

/** Rang d'une section dans le dossier ; une valeur inconnue passe en dernier. */
export function sectionRank(value: string | undefined): number {
    const index = dossierSections.findIndex(
        (section) => section.value === value,
    );

    return index === -1 ? dossierSections.length : index;
}

export function sectionLabel(value: string | undefined): string {
    return (
        dossierSections.find((section) => section.value === value)?.label ??
        'Autres pièces'
    );
}

/**
 * Qualité de la relation avec un agent immobilier. Miroir de l'enum PHP
 * `App\Enums\RelationshipQuality` (valeur stockée, libellé affiché).
 */
export const relationshipQualities = [
    { value: 'excellent', label: 'Excellente' },
    { value: 'good', label: 'Bonne' },
    { value: 'to_build', label: 'À construire' },
    { value: 'difficult', label: 'Difficile' },
] as const;

export type RelationshipQualityValue =
    (typeof relationshipQualities)[number]['value'];

/** Teinte du badge, du vert (excellente) au rouge (difficile). */
export const relationshipQualityTones: Record<
    RelationshipQualityValue,
    string
> = {
    excellent:
        'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300',
    good: 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
    to_build:
        'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    difficult: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
};

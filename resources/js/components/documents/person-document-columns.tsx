import type { DocumentUpload, HouseholdPersonDetail } from '@/types';

/** Une pièce demandée à une personne, à plat : une ligne du tableau. */
export type PersonDocumentRow = {
    category: string;
    categoryLabel: string;
    label: string;
    hint: string | null;
    /** Clé de la pièce dans le catalogue, pour y verser un fichier. */
    key: string | null;
    uploads: DocumentUpload[];
};

/**
 * Les pièces d'une personne, mises à plat dans l'ordre du catalogue : une
 * ligne par pièce, chacune portant sa catégorie pour que le tableau la
 * répète sans jamais la perdre.
 */
export function personDocumentRows(
    person: HouseholdPersonDetail,
): PersonDocumentRow[] {
    return person.categories.flatMap((category) =>
        category.documents.map((document) => ({
            category: category.value,
            categoryLabel: category.label,
            label: document.label,
            hint: document.hint,
            key: document.key ?? null,
            uploads: document.uploads ?? [],
        })),
    );
}

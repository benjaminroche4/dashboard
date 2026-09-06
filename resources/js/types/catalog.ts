/** Pièce du catalogue telle qu'administrée (identifiant, clé stable, traductions). */
export type CatalogDocumentItem = {
    id: number;
    key: string;
    label: string;
    label_en: string | null;
    hint: string | null;
    hint_en: string | null;
};

/** Catégorie du catalogue avec ses pièces, pour la page d'administration. */
export type CatalogAdminGroup = {
    value: string;
    label: string;
    items: CatalogDocumentItem[];
};

export type CatalogDocumentForm = {
    category: string;
    label: string;
    label_en: string;
    hint: string;
    hint_en: string;
};

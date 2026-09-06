import type { CatalogAdminGroup, CatalogDocumentItem } from '@/types';

export const catalogCategories = [
    { value: 'identity', label: 'Identité' },
    { value: 'work', label: 'Travail' },
];

export function makeCatalogDocument(
    overrides: Partial<CatalogDocumentItem> = {},
): CatalogDocumentItem {
    return {
        id: 1,
        key: 'identity_document',
        label: "Passeport ou carte d'identité",
        label_en: 'Passport or ID card',
        hint: 'Recto et verso',
        hint_en: 'Front and back',
        ...overrides,
    };
}

/** Miroir de DocumentCatalog::administrable() sur deux catégories. */
export const catalogAdminGroups: CatalogAdminGroup[] = [
    {
        value: 'identity',
        label: 'Identité',
        items: [
            makeCatalogDocument(),
            makeCatalogDocument({
                id: 2,
                key: 'family_record_book',
                label: 'Livret de famille',
                label_en: null,
                hint: null,
                hint_en: null,
            }),
        ],
    },
    { value: 'work', label: 'Travail', items: [] },
];

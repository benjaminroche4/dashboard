import type {
    CatalogGroup,
    DocumentRequestDetail,
    DocumentRequestEdit,
    DocumentRequestSummary,
    HouseholdPersonForm,
} from '@/types';

/** Catalogue réduit, même forme que DocumentCatalog::grouped(). */
export const catalog: CatalogGroup[] = [
    {
        value: 'identity',
        label: 'Identité',
        items: [
            {
                key: 'identity_document',
                label: "Passeport ou carte d'identité",
                hint: 'Recto et verso',
            },
            {
                key: 'family_record_book',
                label: 'Livret de famille',
                hint: null,
            },
        ],
    },
    {
        value: 'work',
        label: 'Travail',
        items: [
            {
                key: 'payslips',
                label: '3 derniers bulletins de salaire',
                hint: null,
            },
            {
                key: 'employment_contract',
                label: 'Contrat de travail',
                hint: 'Complet et signé',
            },
        ],
    },
];

export const roles = [
    { value: 'tenant' as const, label: 'Locataire' },
    { value: 'guarantor' as const, label: 'Garant' },
];

export const languages = [
    { value: 'fr' as const, label: 'Français' },
    { value: 'en' as const, label: 'Anglais' },
];

/** Personne du formulaire, nommée et locataire par défaut. */
export function makePersonForm(
    overrides: Partial<HouseholdPersonForm> = {},
): HouseholdPersonForm {
    return {
        first_name: 'Léa',
        last_name: 'Martin',
        role: 'tenant',
        documents: [],
        ...overrides,
    };
}

/** Miroir de DocumentRequestFactory : liste française, client = première personne. */
export function makeDocumentRequest(
    overrides: Partial<DocumentRequestSummary> = {},
): DocumentRequestSummary {
    return {
        id: 1,
        uuid: '0199b0c0-0000-7000-8000-000000000001',
        first_name: 'Léa',
        last_name: 'Martin',
        name: 'Léa Martin',
        language: 'fr',
        language_label: 'Français',
        person_count: 1,
        document_count: 2,
        creator: 'Admin',
        creator_avatar: null,
        lead: null,
        created_at: '2026-09-06T10:00:00+02:00',
        ...overrides,
    };
}

export function makeDocumentRequestDetail(
    overrides: Partial<DocumentRequestDetail> = {},
): DocumentRequestDetail {
    return {
        ...makeDocumentRequest(),
        message: 'Merci de tout déposer avant le 15.',
        upload_url: 'https://drive.google.com/drive/folders/abc',
        persons: [
            {
                name: 'Léa Martin',
                role: 'Locataire',
                categories: [
                    {
                        value: 'identity',
                        label: 'Identité',
                        documents: [
                            {
                                label: "Passeport ou carte d'identité",
                                hint: 'Recto et verso',
                            },
                        ],
                    },
                    {
                        value: 'work',
                        label: 'Travail',
                        documents: [
                            {
                                label: '3 derniers bulletins de salaire',
                                hint: null,
                            },
                        ],
                    },
                ],
            },
        ],
        ...overrides,
    };
}

/** Liste existante telle que renvoyée par la page de modification. */
export function makeDocumentRequestEdit(
    overrides: Partial<DocumentRequestEdit> = {},
): DocumentRequestEdit {
    return {
        id: 1,
        uuid: '0199b0c0-0000-7000-8000-000000000001',
        name: 'Léa Martin',
        lead_id: null,
        language: 'en',
        message: 'Merci de tout déposer avant le 15.',
        upload_url: 'https://drive.google.com/drive/folders/abc',
        persons: [
            makePersonForm({ documents: ['payslips'] }),
            makePersonForm({
                first_name: 'Paul',
                role: 'guarantor',
                documents: ['identity_document'],
            }),
        ],
        ...overrides,
    };
}

import type {
    DocumentRequestLeadOption,
    DocumentUpload,
    PublicDocumentPerson,
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
/** Leads proposés dans le sélecteur du formulaire. */
export const documentRequestLeads: DocumentRequestLeadOption[] = [
    {
        id: 7,
        uuid: 'lead-uuid-7',
        name: 'Léa Martin',
        first_name: 'Léa',
        last_name: 'Martin',
        reference: 'LD-1042',
        company: null,
        language: 'fr',
        is_client: false,
        guarantors: ['physique', 'garantme'],
    },
    {
        id: 9,
        uuid: 'lead-uuid-9',
        name: 'John Smith',
        first_name: 'John',
        last_name: 'Smith',
        reference: 'LD-1043',
        company: 'Acme',
        language: 'en',
        is_client: true,
        guarantors: [],
    },
];

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
        public_url: 'https://dashboard.test/depot/tok-abc',
        access_code: '482913',
        link_sent_to: null,
        link_sent_at: null,
        lead_emails: ['lea@example.com'],
        uploads_count: 0,
        can_update: true,
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
                                key: 'id_document',
                                label: "Passeport ou carte d'identité",
                                hint: 'Recto et verso',
                                uploads: [],
                            },
                        ],
                    },
                    {
                        value: 'work',
                        label: 'Travail',
                        documents: [
                            {
                                key: 'payslips',
                                label: '3 derniers bulletins de salaire',
                                hint: null,
                                uploads: [],
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

/** Fichier déposé par le client, tel que listé sur la page de la liste. */
export function makeDocumentUpload(
    overrides: Partial<DocumentUpload> = {},
): DocumentUpload {
    return {
        id: 1,
        uuid: '0199b0c0-0000-7000-8000-0000000000aa',
        name: 'passeport.pdf',
        size: 245_000,
        uploaded_at: '2026-09-08T10:00:00+02:00',
        download_url:
            '/tools/documents/0199b0c0-0000-7000-8000-000000000001/uploads/0199b0c0-0000-7000-8000-0000000000aa',
        ...overrides,
    };
}

/** Personne de la page publique de dépôt, avec ses pièces. */
export function makePublicPerson(
    overrides: Partial<PublicDocumentPerson> = {},
): PublicDocumentPerson {
    return {
        index: 0,
        name: 'Léa Martin',
        role: 'Locataire',
        categories: [
            {
                value: 'identity',
                label: 'Identité',
                documents: [
                    {
                        key: 'id_document',
                        label: "Passeport ou carte d'identité",
                        hint: 'Recto et verso',
                        uploads: [],
                    },
                    {
                        key: 'payslips',
                        label: '3 derniers bulletins de salaire',
                        hint: null,
                        uploads: [
                            {
                                uuid: 'up-1',
                                name: 'bulletin-juin.pdf',
                                size: 120_000,
                                uploaded_at: '2026-09-08T10:00:00+02:00',
                            },
                        ],
                    },
                ],
            },
        ],
        ...overrides,
    };
}

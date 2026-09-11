import type { TenantProfile } from '@/types';

/** Détails d'un locataire du dossier, tout renseigné par défaut. */
export function makeTenantProfile(
    overrides: Partial<TenantProfile> = {},
): TenantProfile {
    return {
        name: 'Léa Durand',
        role: 'Locataire',
        birth_date: '1994-05-12',
        nationality: 'Brésilienne',
        birth_place: 'São Paulo, Brésil',
        residency_status: 'passeport_talent',
        residency_label: 'Passeport talent',
        residency_needs_document: true,
        residency_number: 'FR-123456',
        residency_expires_at: '2030-01-31',
        employment_status: 'cdi',
        employment_label: 'CDI',
        employer: 'Doctolib',
        income_cents: 420_050,
        ...overrides,
    };
}

export const residencyStatuses = [
    { value: 'ue', label: 'Citoyen de l’Union européenne' },
    { value: 'passeport_talent', label: 'Passeport talent' },
];

export const employmentStatuses = [
    { value: 'cdi', label: 'CDI' },
    { value: 'etudiant', label: 'Étudiant' },
];
